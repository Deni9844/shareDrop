/// <reference types="vite/client" />

interface Id {
  id: string
}

interface User extends Id {
  userAgent: string;
  fullName: string
}

interface HoverUser extends Id {
  isHover: boolean
}

interface FileType {
  senderId: string;
  name: string;
  size: number;
}

interface ReceivedFileType{
  receiverId: string;
  files: FileType[]
}

interface MsgType{
  senderId: string;
  text: string;
}

interface ReceivedMsgType {
  receiverId: string;
  msg:MsgType[];
}

type options = "fileSender" | "selected" | "msgSender"


