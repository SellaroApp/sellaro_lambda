import axios from 'axios'
import { WhatsappChatModel } from "../models/whatsapp.model.js"
import { AppError } from '../classes/error.class.js'

export const formatPhoneNumber = (pNumber) => {
    let phoneCustomer = pNumber.replace(/\D/g, '')
  
    if (phoneCustomer.length === 10 || phoneCustomer.length === 11) {
      phoneCustomer = '55' + phoneCustomer
    }
    return phoneCustomer
  }
  
  export const findChatByCustomerPhone = async (
    userId,
    phoneCustomer,
  ) => {
    return WhatsappChatModel.findOne({
      userId,
      phoneCustomer: { $regex: phoneCustomer.slice(-8) + '$' },
    }).sort({
      createdAt: -1,
    })
  }
  
  export const getProxy = async () => {
    try {
      const urlProxy = `https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=25`
      const { data: dataProxy } = await axios.get(urlProxy, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `token 45zjyuqv4to0hq4wu16l4pzkp4m1mvo5jomyy3s2`,
        },
      })
  
      let proxyData = { proxy: null }
      if (dataProxy && dataProxy.results.length > 0) {
        let randomIndex = Math.floor(Math.random() * 20)
        if (dataProxy.count) {
          randomIndex = Math.floor(
            Math.random() * Number(dataProxy.results.length),
          )
        }
  
        const proxyItem = dataProxy.results[randomIndex]
        if (proxyItem) {
          proxyData.proxy = {
            host: proxyItem.proxy_address,
            port: proxyItem.port,
            username: proxyItem.username,
            password: proxyItem.password,
            protocol: 'http',
          }
        }
      }
  
      return proxyData
    } catch {
      return { proxy: null }
    }
  }
  
  export const getInstance = async (userId) => {
    try {
      const url = `${process.env.WHATSAPP_EVOLUTION_URL}/instance/fetchInstances?instanceName=${userId}`
      const { data } = await axios.get(url, {
        headers: {
          Apikey: `${process.env.WHATSAPP_EVOLUTION_API_TOKEN}`,
        },
      })
      if (data.length > 0) {
        const settings = data[0].Setting
        const status = data[0].connectionStatus
        const {
          ...filteredData
        } = data[0]

        const phone = String(filteredData.ownerJid).split('@')[0]

        return { status, ...filteredData, ...settings, phone }
      }
      return await createInstance(userId)
    } catch (err) {
      return await createInstance(userId)
    }
  }
  
  export const createInstance = async (userId) => {
    const url = `${process.env.WHATSAPP_EVOLUTION_URL}/instance/create`
  
    try {
      let apiUrl = process.env.BACKEND_URL + '/whatsapp'
  
      const proxyData = await getProxy()
  
      if (!proxyData || !proxyData.proxy) {
        return {
          createError: true,
        }
      }
  
      const { data } = await axios.post(
        url,
        {
          instanceName: userId,
          webhook: {
            url: apiUrl,
            byEvents: true,
            base64: true,
            events: [
              'MESSAGES_SET',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_DELETE',
              'SEND_MESSAGE',
            ]
          },
          integration: 'WHATSAPP-BAILEYS',
          ...proxyData,
        },
        {
          headers: {
            apikey: `${process.env.WHATSAPP_EVOLUTION_API_TOKEN}`,
          },
        },
      )
  
      return data
    } catch (err) {
      if (err.response && err.response.status === 403) {
        throw new AppError(
          'Access forbidden: Invalid API token or insufficient permissions',
          err,
          403,
          'ForbiddenError',
        )
      } else if (err.response && err.response.status === 400) {
        return {
          reconnect: true,
        }
      } else {
        throw new AppError(
          'Get instance error',
          err,
          err.response ? err.response.status : 500,
          'GetInstanceError',
        )
      }
    }
  }

  export const sendSocketEvent = async (chatId, senderName, message) => {
    const url = process.env.BACKEND_URL + '/whatsapp/socketevent'
    const { data } = await axios.post(
      url,
      {
        chatId,
        senderName,
        message
      },
      {
      headers: {
          apikey: `${process.env.WHATSAPP_EVOLUTION_API_TOKEN}`,
        },
      },
    )

    return data
}

export const replacePlaceholders = (message, lead) => {
  return message
    .replace('{{nome}}', lead.name || '')
    .replace('{{email}}', lead.email || '')
    .replace('{{telefone}}', lead.telephone || '')
}
