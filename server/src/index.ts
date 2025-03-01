import server from "./app";
import ElasticsearchService from './services/elasticsearch.service'
import dotenv from "dotenv";

dotenv.config();

export async function bootstrap() {
  const esService = ElasticsearchService.getInstance()
  
  try {
    const isConnected = await esService.checkConnection()
    if (!isConnected) {
      console.error('Failed to connect to Elasticsearch')
      process.exit(1)
    }
    
    console.log('Application successfully started')

    server.listen(process.env.PORT, () => {
        console.log(`Server is running on http://localhost:${process.env.PORT}`);
      });
    //console.log(await esService.retrieveAllMediaWithPit())
    
  } catch (error) {
    console.error('Application failed to start:', error)
    process.exit(1)
  }
}

bootstrap();