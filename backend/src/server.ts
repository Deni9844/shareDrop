
import httpServer from './app.js'
import dotenv from 'dotenv'
import path from 'path';
import { fileURLToPath } from 'url';

// Derive __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from dotenv file
dotenv.config({ path: path.join(__dirname, '../config/config.env') });

//hosting a server
const PORT = process.env.PORT  ;
httpServer.listen(PORT,() => {
  console.log(`Server listening on port ${PORT}`);
});

