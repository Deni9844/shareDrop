import httpServer from './app.js';
//hosting a server
const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
