import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import DesktopWindowsRoundedIcon from '@mui/icons-material/DesktopWindowsRounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import DesktopMacRoundedIcon from '@mui/icons-material/DesktopMacRounded';
import DeviceUnknownRoundedIcon from '@mui/icons-material/DeviceUnknownRounded';
import { faker } from '@faker-js/faker';
import Textarea from '@mui/joy/Textarea';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { useToast } from "@/hooks/use-toast"

import './FileSharing.css'

const port = import.meta.env.VITE_PORT

const socket: Socket = io(`https://sharedrop-t1yn.onrender.com:${port}`, {
  transports: ['websocket'],  // Enforce WebSocket connection
  reconnectionAttempts: 5,  // Try to reconnect if the connection drops
  reconnectionDelay: 1000,  // Set reconnection delay (in ms)
  forceNew: true, // Force a new connection each time
  timeout: 60000, // Set timeout to 60 seconds
});


const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [senderUser, setSenderUser] = useState<FileType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [hoverUser, setHoverUser] = useState<HoverUser>()
  const [isFileAccepted, setIsFileAccepted] = useState<boolean | null>(false)
  const [messageBox, setMessageBox] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState<string>("")
  const [receivedMsg, setReceivedMsg] = useState<string>("")
  const [initial, setInitial] = useState<boolean>(true)
  const [receivedMsgArr, setReceivedMsgArr] = useState<ReceivedMsgType[]>([])
  const [receivedFileArr, setReceivedFileArr] = useState<ReceivedFileType[]>([])
  const [receivedFile, setReceivedFile] = useState<FileType | null>(null)
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean>(false);

  const { toast } = useToast()

  useEffect(() => {
    // Get the socket ID of the current user
    socket.on('connect', () => {
      const userAgent = navigator.userAgent; // Get the User-Agent string
      setCurrentUser(socket.id!);
      const fullName: string = getRandomName();
      socket.emit('userDetails', { userAgent, fullName }); // Send User-Agent to the server
    });

    // Receive the list of all connected users
    socket.on('users', (usersList: User[]) => {
      setUsers(usersList);
    });

    // Get the sender ID, file name, and size if it is the receiver
    socket.on('senderId', (data: FileType) => {
      setSenderUser(data);
      if (data.name && data.size) {
        setReceivedFileArr(prev => {
          // Find the current receiver user in the latest state
          const currentReceiverUser = prev.find(r => r.receiverId === socket.id);
          let arr: FileType[] = [];
          if (currentReceiverUser) {
            arr = [...currentReceiverUser.files, { senderId: data.senderId, name: data.name, size: data.size }];
          } else {
            arr.push({ senderId: data.senderId, name: data.name, size: data.size });
          }

          // Return the updated state array with the file added for this user
          return prev.some(r => r.receiverId === socket.id)
            ? prev.map(r => (r.receiverId === socket.id ? { ...r, files: arr } : r))
            : [...prev, { receiverId: socket.id!, files: arr }];
        });
      }
      setInitial(false);
    });

    // Get the progress percent for showing it on the receiver side
    socket.on('progressPer', ({ progressPer }) => {
      setProgress(progressPer);
    });

    // Get the response if the sender can initiate the file transfer
    socket.on('fileTransfer', ({ acceptFile }) => {
      setIsFileAccepted(acceptFile);
    });

    // Get the message if it is the receiver
    socket.on('receiveMessage', ({ msg, senderId }: { msg: string, senderId: string }) => {
      setReceivedMsgArr(prev => {
        // Find the current receiver user in the latest state
        const currentReceiverUser = prev.find(r => r.receiverId === socket.id);
        let arr: MsgType[] = [];
        if (currentReceiverUser) {
          arr = [...currentReceiverUser.msg, { text: msg, senderId }];
        } else {
          arr.push({ text: msg, senderId });
        }

        // Return the updated state array with the new message added for this user
        return prev.some(r => r.receiverId === socket.id)
          ? prev.map(r => (r.receiverId === socket.id ? { ...r, msg: arr } : r))
          : [...prev, { receiverId: socket.id!, msg: arr }];
      });
    });



    // Listen for the file being sent to this user
    socket.on('receiveFile', ({ fileName, fileType, fileData }) => {
      // Create a Blob from the file data
      const blob = new Blob([new Uint8Array(fileData)], { type: fileType });

      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click(); // Automatically trigger download

      // Cleanup the object URL
      URL.revokeObjectURL(url);
      toast({
        description: "File downloaded",
        mode: darkMode
       })
      
    });

    // Cleanup all listeners when the component unmounts
    return () => {
      socket.off('connect');
      socket.off('users');
      socket.off('senderId');
      socket.off('progressPer');
      socket.off('fileTransfer');
      socket.off('receiveMessage');
      socket.off('receiveFile');
    };
  }, []); // Empty dependency array to ensure this only runs once


  useEffect(() => {
    if (file && isFileAccepted) {
      handleSendFile()
      setIsFileAccepted(null)
    } else if (file && isFileAccepted !== null) {
      socket.emit('getSenderId', { targetUserId: selectedUser, name: file.name, size: file.size })
    }

  }, [file, isFileAccepted])

  useEffect(() => {
    if ((receivedFile === null)) {
      setTimeout(() => {
        const currentReceiverUser = receivedFileArr.find(r => r.receiverId === currentUser)
        if (currentReceiverUser) {
          if (currentReceiverUser.files.length > 0) {
            const { name, senderId, size } = currentReceiverUser.files[0]
            setReceivedFile({ name, senderId, size })
          } else {
            handleFileArr()
          }
        }
      }, 400)
    }

    if (Notification.permission === 'granted') {
      setIsNotificationEnabled(true);
    }else{
      setIsNotificationEnabled(false)
    }
  }, [receivedFile, receivedFileArr, currentUser])

  const enableNotifications = async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') setIsNotificationEnabled(true)
      else setIsNotificationEnabled(false)
  };

  const handleFileArr = () => {
    const currentReceiverUser = receivedFileArr.find(r => r.receiverId === currentUser)
    if (currentReceiverUser) {
      if (currentReceiverUser.files.length > 0) {
        const arr = currentReceiverUser.files.filter((_, i) => i !== 0)
        setReceivedFileArr((prev) => prev.map((r => r.receiverId === currentUser ? { ...r, files: arr } : r)))
      } else {
        const updatedFileArr = receivedFileArr.filter(r => r.receiverId !== currentUser);
        setReceivedFileArr(updatedFileArr);
      }
    }
  }

  useEffect(() => {
    if (Number(progress.toFixed(0)) >= 100) {
      setProgress(0)
      setSenderUser(null)
      setSelectedUser(null)
    }

    if ((receivedMsg === "")) {
      setTimeout(() => {
        handleReceivedMessage()
      }, 400)
    }
  }, [progress, receivedMsg, receivedMsgArr, currentUser])


  const handleReceivedMessage = () => {
    const currentReceiverUser = receivedMsgArr.find(r => r.receiverId === currentUser)
    if (currentReceiverUser) {
      if (currentReceiverUser.msg.length > 0) {
        setReceivedMsg(currentReceiverUser.msg[0].text)
      } else {
        handleMsgArr()
      }
    }
  }

  const handleMsgArr = () => {
    const currentReceiverUser = receivedMsgArr.find(r => r.receiverId === currentUser)
    if (currentReceiverUser) {
      if (currentReceiverUser.msg.length > 0) {
        const arr = currentReceiverUser.msg.filter((_, i) => i !== 0)
        setReceivedMsgArr((prev) => prev.map((r => r.receiverId === currentUser ? { ...r, msg: arr } : r)))
      } else {
        const updatedMsgArr = receivedMsgArr.filter(r => r.receiverId !== currentUser);
        setReceivedMsgArr(updatedMsgArr);
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files ? event.target.files[0] : null;
    setFile(selectedFile);
    setIsFileAccepted(false)
  };


  const handleSendFile = () => {
    const CHUNK_SIZE = 64 * 1024; // 64KB per chunk
    const totalChunks = Math.ceil(file!.size / CHUNK_SIZE);
    let currentChunk = 0;


    const reader = new FileReader();

    reader.onload = () => {
      const chunk = reader.result;
      socket.emit('sendFileChunk', {
        targetUserId: selectedUser,
        fileData: chunk,
        chunkNumber: currentChunk,
        totalChunks,
        fileName: file!.name,
        fileType: file!.type,
      });

      currentChunk += 1;
      const progressPer = (currentChunk / totalChunks) * 100
      setProgress(progressPer);
      socket.emit('progress', {
        progressPer,
        targetUserId: selectedUser
      })
      if (currentChunk < totalChunks) {
        readNextChunk();
      }else{
        toast({
          description: "File transfer completed",
          mode:darkMode
         })
        
      }
    };

    const readNextChunk = () => {
      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(file!.size, start + CHUNK_SIZE);
      const blob = file!.slice(start, end);
      reader.readAsArrayBuffer(blob);
    };

    readNextChunk(); // Start reading the first chunk
  };

  const getRandomName = (): string => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    return `${firstName} ${lastName}`
  }

  const getName = (val: options): string => {
    const providerUser = users.find(user => val === "msgSender" ? user.id === receivedMsgArr[0]?.msg[0]?.senderId : val === "fileSender" ?
      user.id === receivedFileArr[0]?.files[0]?.senderId :
      user.id === selectedUser
    )
    return providerUser?.fullName || ""
  }

  const getFixedSize = (size: number): string => {
    if (size >= 1024) {
      const kb = (size / 1020)
      if (kb >= 1024) return `${(kb / 1024).toFixed(0)} MB`
      return `${kb.toFixed(0)} KB`
    }
    return `${size.toFixed(0)} Bytes`
  }

  const acceptFileResponse = () => {
    setReceivedFile(null)
    socket.emit("fileResponse", ({ acceptFile: true, senderId: senderUser?.senderId }))
  }

  const declineFileResponse = () => {
    setReceivedFile(null)
    socket.emit("fileResponse", ({ acceptFile: false, senderId: senderUser?.senderId }))
  }

  const handleClick = () => {
    if (fileInputRef.current) {
      // Reset the input value to allow the same file to be selected again
      fileInputRef.current.value = '';
      setFile(null);  // Clear the previously selected file in state
    }
  };

  const sendMessageHandler = () => {
    toast({
     description: "Message transfer completed",
     mode:darkMode
    })
    setMessageBox(false)
    socket.emit("sendMessage", ({ msg: text, targetUserId: selectedUser }))
    setText("")
  }


  const copyMessageHandler = () => {
    setReceivedMsg("")
    navigator.clipboard.writeText(receivedMsg)
      .then(() => {
        toast({
          description: "Copied to clipboard",
          mode: darkMode
         })
      })
      .catch((err) => {
        console.log(" Failed to copy text : ", err)
      })
    

  }


  const styles: string = "absolute inset-0 m-auto text-white"

  const stylesInline = {
    fontSize: '30px'
  }

  return (
    <div >

      <div className={`relative h-screen w-screen flex justify-center items-center
         ${darkMode ? 'bg-black' : 'bg-Light'} overflow-hidden pt-[40vh] transition-all duration-500`}>
        <div className="absolute rounded-full border-2 border-gray-300 h-[480px] w-[480px] animate-ping" />
        <div className="absolute rounded-full border-2 border-gray-300 h-[400px] w-[400px] animate-ping" />
        <div className="absolute rounded-full border-2 border-gray-300 h-[320px] w-[320px] animate-ping" />
        <div className="absolute rounded-full border-2 border-gray-300 h-[240px] w-[240px] animate-ping" />
        <div className="absolute rounded-full border-2 border-gray-300 h-[180px] w-[180px] animate-ping" />
        <div className="absolute rounded-full border-2 border-gray-300 h-[100px] w-[100px] animate-ping" />


        <div className="absolute top-[2%] right-[2%] flex gap-2">
          <div className={`p-[0.4rem] ${darkMode ? 'hover:bg-DDarkBlue' : 'hover:bg-LDarkBlue'} rounded-full h-fit flex 
          text-center justify-center transition-all duration-300` }  onClick={() => enableNotifications()}>
            {
              isNotificationEnabled ?  <NotificationsIcon style={{ fontSize: '1.5rem' }} className={`${darkMode ? 'text-white' : 'text-black'}`} />:
              <NotificationsOffIcon style={{ fontSize: '1.5rem' }} className={`${darkMode ? 'text-white' : 'text-black'}`} />
            }
           
          </div>
         

          <div className={`expandable-icon-container ${darkMode ? 'hover:bg-DLightBlue' : 'hover:bg-LLightBlue'} rounded-full`}>
            {
              darkMode ? <>
                <div className={`p-[0.4rem] ${darkMode ? 'hover:bg-DDarkBlue' : 'hover:bg-LDarkBlue'} rounded-full flex text-center 
            justify-center transition-all duration-300`} onClick={() => setDarkMode(true)}>
                  <DarkModeIcon style={{ fontSize: '1.5rem', textAlign: 'center' }} className={`${darkMode ? 'text-white' : 'text-black'}`} />
                </div>
                <div className={`p-[0.4rem] ${darkMode ? 'hover:bg-DDarkBlue' : 'hover:bg-LDarkBlue'} rounded-full flex text-center 
            justify-center transition-all duration-300`} onClick={() => setDarkMode(false)} >
                  <LightModeIcon style={{ fontSize: '1.5rem' }} className={`${darkMode ? 'text-white' : 'text-black'}`} />
                </div>
              </> :
                <>
                  <div className={`p-[0.4rem] ${darkMode ? 'hover:bg-DDarkBlue' : 'hover:bg-LDarkBlue'} rounded-full flex text-center 
            justify-center transition-all duration-300`} onClick={() => setDarkMode(false)}>
                    <LightModeIcon style={{ fontSize: '1.5rem' }} className={`${darkMode ? 'text-white' : 'text-black'}`} />
                  </div>
                  <div className={`p-[0.4rem] ${darkMode ? 'hover:bg-DDarkBlue' : 'hover:bg-LDarkBlue'} rounded-full flex text-center 
            justify-center transition-all duration-300`} onClick={() => setDarkMode(true)}>
                    <DarkModeIcon style={{ fontSize: '1.5rem', textAlign: 'center' }} className={`${darkMode ? 'text-white' : 'text-black'}`} />
                  </div>
                </>
            }

          </div>
        </div>

        {
          (users.find(user => user.id !== currentUser)) && <p className={`absolute text-center top-[12%] text-[0.95rem] ${darkMode ? 'text-gray-500 font-medium':'text-gray-500'}`}>
            {`Click to send files or ${(window.innerWidth) > 650 ? 'right click':'long tap'} to send a message `}</p>
        }
        <div className="absolute flex flex-wrap overflow-x-auto h-[42vh] justify-center gap-x-16 gap-y-4 items-center lg:max-w-[60vw] sm:max-w-[95vw]  md:max-w-[85vw]  z-2 bottom-[40vh]  ">
          {(users.find(user => user.id !== currentUser)) ?  
           users.filter(user => user.id !== currentUser)
            .map((user) => (
              
              <div
                key={user.id}
                onMouseEnter={() => setHoverUser({ isHover: true, id: user.id })}
                onMouseLeave={() => setHoverUser({ isHover: false, id: user.id })}
                onContextMenu={(e) => { e.preventDefault(), setMessageBox(true), setSelectedUser(user.id), setInitial(false) }}
                className="flex flex-col items-center justify-center cursor-pointer"
                onClick={() => {
                  setSelectedUser(user.id);
                  document.getElementById("file")!.click();
                }}
              >

                <div className={`relative shadow-lg bg-blue-500 h-14 w-14 rounded-full 
               before:content-[" "] before:absolute before:left-[37%] before:bottom-[-20%] 
                before:w-[26%] before:h-[10%] before:bg-blue-500 before:rounded-full
                ${hoverUser?.id === user.id && hoverUser.isHover
                    ? "transition-transform duration-300 scale-105"
                    : ""
                  }`}
                >

                  {progress > 0 &&
                    (user.id === senderUser?.senderId || user.id === selectedUser) && (
                      <svg
                        className="absolute top-0 left-0 w-[calc(100%+8px)] h-[calc(100%+8px)] -translate-x-1 -translate-y-1"
                        viewBox="0 0 36 36"
                      >
                        <path
                          className="text-gray-200"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        ></path>

                        <path
                          className="text-blue-600"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray="100"
                          strokeDashoffset={100 - progress}
                          style={{ transition: "stroke-dashoffset 0.5s ease" }}
                        ></path>
                      </svg>
                    )}

                  {user.userAgent === "Windows" ? (
                    <DesktopWindowsRoundedIcon className={styles} style={stylesInline} />
                  ) : user.userAgent === "Android" ? (
                    <PhoneAndroidRoundedIcon className={styles} style={stylesInline} />
                  ) : user.userAgent === "iOS" ? (
                    <PhoneIphoneRoundedIcon className={styles} style={stylesInline} />
                  ) : user.userAgent === "MacOS" ? (
                    <DesktopMacRoundedIcon className={styles} style={stylesInline} />
                  ) : (
                    <DeviceUnknownRoundedIcon />
                  )}
                </div>

                <div className="text-center mt-3">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>{user.fullName}</p>
                  <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user.userAgent}</p>
                </div>
              </div>


            )) : <div>
            <p className="text-blue-600 text-[1.6rem]">Open shareDrop on other devices to send files</p>
            <p className={`text-center text-base ${darkMode ? 'text-white' : 'text-black'}`}>From Your Screen to Theirs - Fast, Secure, Connected.</p>
          </div>
          }
        </div>

        <div>
          <input type="file" id="file"
            ref={fileInputRef}
            className='hidden'
            onChange={handleFileChange}
            onClick={handleClick} />
        </div>
        <div className="text-blue-500">
          <PodcastsIcon style={{ fontSize: '80px' }} />
        </div>


        <div className="absolute bottom-1 gap-2">
          <p className={`text-lg text-center pb-1 ${darkMode ? 'text-white' : 'text-black'}`}>You are known as: <span className="text-blue-600 font-bold">
            {users.find(user => user.id === currentUser)?.fullName}</span></p>
          <div className="mt-2 space-x-2 border-2 border-gray-400 p-1 rounded-2xl flex flex-col justify-center">
            <p className={`text-center text-base ${darkMode ? 'text-white' : 'text-black'}`}>You can be discovered:</p>
            <button className="bg-blue-500 text-base text-white px-3 py-0 rounded-lg self-center mt-1">on this network</button>
          </div>
        </div>
      </div>


      {/* File Transfer Request Popup Box for receiver */}
      {((receivedFileArr.some(r => r.receiverId === currentUser)) || (initial)) && (
        <div className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-4 transition-all  duration-300 ${receivedFile !== null ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
          <div className={`${darkMode ? 'bg-Dark' : 'bg-white'} rounded-3xl shadow-lg w-[450px] transition-transform duration-300 ${receivedFile !== null ? 'scale-100' : 'scale-80'}`}>
            <div className="flex items-center justify-center mb-4 px-4 py-4 bg-blue-500 rounded-t-3xl">
              <h3 className="text-2xl font-medium text-white text-center">File Transfer Requested</h3>
            </div>
            {
              (receivedFileArr.some(r => r.receiverId === currentUser) && receivedFile) && <p className={` mb-4 px-6 text-center
              ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                <span className="font-medium text-white bg-blue-500 rounded-md px-1 text-base">
                  {getName("fileSender")}
                </span> would like to share
                <br />
                <span className="font-semibold">{receivedFile.name}</span>
                <br />{getFixedSize(receivedFile.size)}
              </p>
            }

            <div className="flex justify-between px-6 pb-5">
              <button className="px-4 py-2 w-[40%] bg-gray-300 font-medium text-gray-700 rounded-3xl  hover:bg-gray-400 transition-all"
                onClick={() => { declineFileResponse(), handleFileArr() }}>DECLINE</button>
              <button className="px-4 py-2 w-[40%] bg-blue-500 font-medium text-white rounded-3xl  hover:bg-blue-600 transition-all"
                onClick={() => { acceptFileResponse(), handleFileArr() }}>ACCEPT</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Popup Box for sender*/}
      {
        (selectedUser || (initial)) &&
        (
          <div className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-4 transition-all  duration-300 ${messageBox ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
            <div className={`${darkMode ? 'bg-Dark' : 'bg-white'} rounded-3xl shadow-lg w-[450px] transition-transform duration-300 ${messageBox ? 'scale-100' : 'scale-80'}`}>
              <div className="flex items-center justify-center mb-4 px-4 py-4 bg-blue-500 rounded-t-3xl">
                <h3 className="text-2xl font-medium text-white text-center">Send Message</h3>
              </div>
              {
                !initial && <p className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} px-6 text-center text-lg font-semibold`}>
                  To:<span className="font-medium text-white bg-blue-500 rounded-md px-1 py-[0.1rem] text-base ml-1">
                    {getName("selected")}
                  </span>
                  <br />
                </p>
              }

              <Textarea name="primary" placeholder="Type message..." variant="plain"
                onChange={(e) => setText(e.target.value)} value={text}
                sx={{
                  padding: '0.6rem',
                  '--Textarea-focusedInset': 'none',
                  fontFamily: 'unset',
                  fontSize: '17px',
                  fontWeight: 'medium',
                  backgroundColor: darkMode ? "#202020" : "#f3f4f6",
                  margin: '0.8rem 1.5rem 1.25rem',
                  color: darkMode ? "white" : 'black',
                  '&:hover': {
                    color: darkMode ? "white" : 'black',
                  },
                }} />

              <div className="flex justify-between px-6 pb-5">
                <button className="px-4 py-2 w-[40%] bg-gray-300 font-medium text-gray-700 rounded-3xl hover:bg-gray-400 transition-all"
                  onClick={() => setMessageBox(false)}>CANCLE</button>
                <button className={`px-4 py-2 w-[40%] bg-blue-500 font-medium text-white rounded-3xl
                ${text === "" ? 'cursor-not-allowed' : 'hover:bg-blue-600 transition-all'} `}
                  disabled={text === ""} onClick={() => sendMessageHandler()}>SEND</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Received Message Popup Box for receiver */}
      {
        (receivedMsgArr.some(r => r.receiverId === currentUser) || (initial)) &&
        (
          <div className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-4 transition-all  duration-300 ${receivedMsg !== "" ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
            <div className={`${darkMode ? 'bg-Dark' : 'bg-white'} rounded-3xl shadow-lg w-[450px] transition-transform duration-300 ${receivedMsg !== "" ? 'scale-100' : 'scale-80'}`}>
              <div className="flex items-center justify-center mb-4 px-4 py-4 bg-blue-500 rounded-t-3xl">
                <h3 className="text-2xl font-medium text-white text-center">Message Received </h3>
              </div>
              {
                (receivedMsgArr.some(r => r.receiverId === currentUser)) && <p className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} px-6 text-center text-lg font-semibold`}>
                  <span className="text-white bg-blue-500 rounded-md px-1 py-[0.1rem] text-base mr-1 font-semibold">
                    {getName("msgSender")}
                  </span>
                  has sent:
                  <br />
                </p>
              }
              <p className={`mx-6 p-2 mb-5 mt-3 text-lg rounded-md h-auto break-all
                ${darkMode ? 'bg-[#202020] text-white':'bg-gray-100 text-black'}`}>{receivedMsg}</p>
              <div className="flex justify-between px-6 pb-5">
                <button className="px-4 py-2 w-[40%] bg-gray-300 font-medium text-gray-700 rounded-3xl  hover:bg-gray-400 transition-all"
                  onClick={() => { setReceivedMsg(""), handleMsgArr() }}>CLOSE</button>
                <button className="px-4 py-2 w-[40%] bg-blue-500 font-medium text-white rounded-3xl  hover:bg-blue-600 transition-all"
                  onClick={() => { copyMessageHandler(), handleMsgArr() }}>COPY</button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default App;
