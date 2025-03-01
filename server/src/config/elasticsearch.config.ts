import { ClientOptions } from '@elastic/elasticsearch'
import dotenv from "dotenv";
dotenv.config();

const elasticsearchConfig: ClientOptions = {
    node: `${process.env.ES_HOST}:${process.env.ES_PORT}`,
    auth: {
        username: process.env.ES_USER!,
        password: process.env.ES_PASSWORD!,
    },
    maxRetries: 5,
    requestTimeout: 60000,
    tls: {
        rejectUnauthorized: false,
    },
};

export default elasticsearchConfig;