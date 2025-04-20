import { isAxiosError } from "axios";
import { processAndSendMessageWhatsappInSqsQueue } from "./app.js";

export const handler = async (event) => {
    try {
        let responseProcess = null;

        for (const record of event.Records) {
            const payload = JSON.parse(record?.body);
            responseProcess = await processAndSendMessageWhatsappInSqsQueue(payload);
            console.log(responseProcess, "responseProcess");
        }

        const response = {
            statusCode: 200,
            responseProcess: responseProcess,
        };
        
        return response;

    } catch (error) {
        if (isAxiosError(error)) {
            console.log(error.response?.data);
        } else {
            console.log(error);
        }
        throw error;
    }
};