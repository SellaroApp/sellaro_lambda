import axios from 'axios'
import mongoose from 'mongoose'
import LeadModel from './models/lead.model.js'
import { WhatsappChatModel, WhatsAppMessagesToRetrySendModel, WhatsappOfficialApiConnectionModel, WhatsappOfficialTemplateModel } from './models/whatsapp.model.js'
import AiAssistantManager from './models/aiAssistantManager.model.js'
import { findChatByCustomerPhone, formatPhoneNumber, getInstance, replacePlaceholders, sendSocketEvent } from './helpers/index.js'
import { AppError } from './classes/error.class.js'

mongoose.connect(process.env.MONGODB_URI)

const getWhatsAppOfficialApiBaseUrlAxios = (
  apiToken,
  phoneId,
) => {
  return axios.create({
    baseURL: `${process.env.META_WPP_BASE_API}/${phoneId}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
  })
}

function has24HoursPassed(pastDate) {
  const now = new Date()
  const past = new Date(pastDate)

  return differenceInHours(now, past) >= 24
}

const getOfficialWppMessageTemplate = async ({
  apiToken,
  templateId,
}) => {
  try {
    const { data } = await axios.get(
      `${process.env.META_WPP_BASE_API}/${templateId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
      },
    )

    return data
  } catch (err) {
    console.log(err)
    return null
  }
}

const sendMessageWhatsappOfficial = async (
  {
    userId,
    message,
    number,
    senderName,
    sentBy,
    assistantManagerId,
    isLastMessage,
    threadId,
    templateId,
  },
  { apiToken, phoneId },
) => {

  const phone = number;
  const API = getWhatsAppOfficialApiBaseUrlAxios(apiToken, phoneId)
  message = message.replace(/\[.*?\]\((https?:\/\/[^\s)]+)\)/g, '$1')

  const isThereChat = await findChatByCustomerPhone(userId, phone)

  if (!isThereChat) return

  try {
    let payload = {}
    let messageSended = message

    const lead = await LeadModel.findById(isThereChat?.leadId)
      .lean()
      .exec()

    // TODO: Desconsiderar janela de 24 hrs quando for o lead que mandou mensagem fora da janela anterior, neste caso o assistente ou o humano pdoe mandar mensagem sem usar template
    if (
      !isThereChat?.lastOfficialWppMessageAt 
        //|| has24HoursPassed(isThereChat.lastOfficialWppMessageAt)) 
        && lead.assistantManagerType === 'ia'
    ) {
      const assistant = await AiAssistantManager.findById(
        lead.assistantManagerId,
      )
        .lean()
        .exec()

      if (!assistant) return

      const templateRow = await WhatsappOfficialTemplateModel.findOne({
        assistantId: assistant.assistantId,
        userId: userId,
      })

      if (templateRow?.id) {
        const template = await getOfficialWppMessageTemplate({
          apiToken,
          templateId: templateRow.templateId,
        })

        if (template?.name) {
          let components = []

          if (templateRow.placeholdersMapper?.length > 0) {
            const placeholdersSorted = templateRow.placeholdersMapper.sort(
              (a, b) => a.position - b.position,
            )

            const placeholderValues = {
              '{{nome}}': lead.name,
              '{{email}}': lead.email,
              '{{telefone}}': lead.telephone,
            }

            const placeholders = placeholdersSorted.map(({ placeholder }) => ({
              type: 'text',
              text: placeholderValues[placeholder],
            }))

            components = [
              {
                type: 'body',
                parameters: placeholders,
              },
            ]
          }

          payload = {
            type: 'template',
            template: {
              name: template.name,
              language: { code: 'pt_BR' },
              ...(components.length > 0 && { components }),
            },
          }

          //messageSended = replacePlaceholders(template.components[0].text, lead)
        }
      }
    } else {
      payload = {
        type: 'text',
        text: {
          body: message,
        },
      }
    }

    console.log('Payload', payload)
    const { data } = await API.post(
      '/messages',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        ...payload,
      },
    )

    if (isThereChat?.leadId) {
      await LeadModel.findByIdAndUpdate(isThereChat.leadId, {
        $set: {
          lastMessageUpdatedAt: new Date(),
        },
      })
    }

    if (sentBy !== 'assistant') {
      if (isThereChat) {
        await WhatsappChatModel.findByIdAndUpdate(
          isThereChat._id,
          {
            nameUser: senderName,
            $push: {
              messages: {
                sentBy,
                senderName: senderName,
                message: messageSended,
                status: 'unread',
                whatsappMessageId: data.messages[0].id,
                isLastMessage,
              },
            },
            updatedAt: new Date(),
          },
          { new: true },
        )
      }
    }

    if (sentBy === 'assistant' && isThereChat) {
      const leadAssistantManagerId = assistantManagerId
        ? assistantManagerId
        : (await LeadModel.findById(isThereChat.leadId).lean().exec())
            .assistantManagerId

      const assistant = await AiAssistantManager.findById(
        leadAssistantManagerId,
      )

      await WhatsappChatModel.findByIdAndUpdate(
        isThereChat._id,
        {
          nameUser: assistant.name,
          assistantId: assistant.assistantId,
          threadId: threadId || isThereChat.threadId,
          lastOfficialWppMessageAt: new Date(),
          $push: {
            messages: {
              createdByAssistantId: assistant.assistantId,
              sentBy: 'assistant',
              senderName: assistant.name,
              message: messageSended,
              status: 'unread',
              whatsappMessageId: data.messages[0].id,
            },
          },
        },
        { new: true },
      )
    }

    return { status: true }
  } catch (err) {
    console.log(err.response)
    return { status: false }
  }
}

export const processAndSendMessageWhatsappInSqsQueue = async ({
  message,
  phone,
  senderName,
  userId,
  numberId,
  sentBy,
  isLastMessage,
  threadId,
  assistantManagerId,
  templateId,
  numberId
}) => {
  console.log(`Processing and sending message to ${phone} from user ${userId} with number ${numberId}`)
  const number = formatPhoneNumber(phone)

  try {
    const isThereChat = await findChatByCustomerPhone(userId, number)
    const officialWhatsAppConnection = await WhatsappOfficialApiConnectionModel.findOne({ userId })

    if (officialWhatsAppConnection && officialWhatsAppConnection.isActive) {
      const data = await sendMessageWhatsappOfficial(
        {
          numberId,
          number,
          message,
          senderName,
          sentBy,
          isLastMessage,
          templateId,
          assistantManagerId,
          threadId,
        },
        {
          apiToken: officialWhatsAppConnection.apiToken,
          phoneId: officialWhatsAppConnection.phoneId,
        },
      )

      await sendSocketEvent(isThereChat._id, senderName, message)

      return data
    }

    const verifyInstance = await getInstance(numberId)

    if (verifyInstance && verifyInstance.status === 'open') {
      
      message = message.replace(/\[.*?\]\((https?:\/\/[^\s)]+)\)/g, '$1')

      const url = `${process.env.WHATSAPP_EVOLUTION_URL}/message/sendText/${numberId}`

      const { data } = await axios({
        method: 'POST',
        url,
        headers: {
          apikey: `${process.env.WHATSAPP_EVOLUTION_API_TOKEN}`,
        },
        data: {
          number: `${number}`,
          text: message,
          delay: 1200,
        },
      })

      if (isThereChat?.leadId) {
        await LeadModel.findByIdAndUpdate(isThereChat.leadId, {
          $set: {
            lastMessageUpdatedAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }

      if (data && sentBy !== 'assistant') {
        
        if (isThereChat?.leadId) {
          await LeadModel.findByIdAndUpdate(isThereChat.leadId, {
            $set: {
              lastMessageUpdatedAt: new Date(),
              updatedAt: new Date(),
            },
          })
        }

        if (isThereChat) {
          await WhatsappChatModel.findByIdAndUpdate(
            isThereChat._id,
            {
              nameUser: senderName,
              $push: {
                messages: {
                  sentBy,
                  senderName: senderName,
                  message,
                  status: 'unread',
                  whatsappMessageId: data.key.id,
                  isLastMessage,
                },
              },
              updatedAt: new Date(),
            },
            { new: true },
          )
        }
      }

      if (data && sentBy === 'assistant' && isThereChat) {
        // Caso o assistantManagerId seja fornecido, significa que este lead estava em uma coluna antes que havia
        // um assistente e ele foi movido para outro assistente antes da mensagem ser enviada
        const leadAssistantManagerId = assistantManagerId ?
          assistantManagerId :
          (await LeadModel.findById(isThereChat.leadId).lean().exec())?.assistantManagerId

        const assistant = await AiAssistantManager.findById(
          leadAssistantManagerId,
        )

        await WhatsappChatModel.findByIdAndUpdate(
          isThereChat._id,
          {
            nameUser: assistant?.name,
            assistantId: assistant?.assistantId,
            threadId: threadId || isThereChat.threadId,
            $push: {
              messages: {
                createdByAssistantId: assistant?.assistantId,
                sentBy: 'assistant',
                senderName: assistant?.name,
                message,
                status: 'unread',
                whatsappMessageId: data.key.id,
              },
            },
          },
          { new: true },
        )
      }

      await sendSocketEvent(isThereChat._id, senderName, message)

      return data
    }

    return { status: false }
  } catch (err) {
    throw new AppError('SendMessageWhatsappError', err, 500, 'SendMessageWhatsappError')
  }
}