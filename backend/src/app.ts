import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { getPlatform } from './utils/functions.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
    },
    pingTimeout: 60000, // Set timeout to 60 seconds
    pingInterval: 25000, // Set interval to 25 seconds
});

//for production
const _dirname = path.resolve();


app.use(express.static(path.join(_dirname,"/dist")));
app.get('*', (_,res) => {
    res.sendFile(path.resolve(_dirname,"dist", "index.html"))
});


interface User {
    id: string;
    userAgent: string;
    fullName: string
}

interface FileChunkData {
    targetUserId: string;
    fileData: ArrayBuffer;
    chunkNumber: number;
    totalChunks: number;
    fileName: string;
    fileType: string;
}

interface FileData {
    chunks: Array<ArrayBuffer>;
    fileName: string;
    fileType: string;
}

interface FileType {
    targetUserId: string,
    name:string,
    size:number
  }

let users: User[] = [];
let fileChunks: { [key: string]: FileData } = {};
let senderId: string = ""



io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    // Listen for user details
    socket.on('userDetails', ({ userAgent, fullName }) => {
        const platform = getPlatform(userAgent); // Determine the platform
        users.push({ id: socket.id, userAgent: platform, fullName }); // Store user ID with platform
        io.emit('users', users); // Emit the updated user list
    });

    // Send updated user list to all clients
    io.emit('users', users);

    // Immediately send the current list of users to the newly connected user
    socket.emit('users', users);

    //send the senderId to the target user
    socket.on('getSenderId', (data:FileType) => {
        const { targetUserId,size,name } = data
        const senderId = socket.id
        io.to(targetUserId).emit('senderId', { senderId ,size,name})
    })

    //send the progress percent to the target user
    socket.on('progress', ({ progressPer, targetUserId }) => {
        io.to(targetUserId).emit('progressPer', { progressPer })
    })

    //send the file response to the sender
    socket.on('fileResponse',({acceptFile,senderId}) => {
        io.to(senderId).emit('fileTransfer',{ acceptFile })
    })

    //send the text to the target user
    socket.on('sendMessage', ({ msg , targetUserId}) => {
        io.to(targetUserId).emit('receiveMessage', ({ msg , senderId : socket.id}))
    })
    // Handle file sending
    socket.on('sendFileChunk', (data: FileChunkData) => {
        const { targetUserId, fileData, chunkNumber, totalChunks, fileName, fileType } = data;

        console.log(`Receiving chunk ${chunkNumber + 1} of ${totalChunks} for file ${fileName}`);

        // Initialize the file data storage if it doesn't exist
        if (!fileChunks[targetUserId]) {
            fileChunks[targetUserId] = {
                chunks: [],
                fileName,
                fileType,
            };
        }

        // Append the chunk to the user's file data
        fileChunks[targetUserId].chunks.push(fileData);

        // If this is the last chunk, reconstruct the file
        if (chunkNumber === totalChunks - 1) {
            const buffer = Buffer.concat(
                //Unit8Array(chunk) for ensuring each chunk in byte format i.e binary format as 1 and 0
                // Then Buffer.from() converts this byte data into a buffer which is designed to handle binary data (raw data) directly
                fileChunks[targetUserId].chunks.map((chunk) => Buffer.from(new Uint8Array(chunk)))
            );

            console.log(`File ${fileName} received fully.`);

            // Emit the file data to the recipient
            io.to(targetUserId).emit('receiveFile', {
                senderId: socket.id,
                fileName,
                fileType,
                fileData: buffer,
            });

            // Cleanup after sending the file
            delete fileChunks[targetUserId];
        }
    });


    // Handle user disconnect
    socket.on('disconnect', (reason) => {
        console.log('A user disconnected:', socket.id);
        console.log('Reason: ', reason)
        users = users.filter(user => user.id !== socket.id);
        io.emit('users', users); // Update clients with the current list
    });
});

export default httpServer