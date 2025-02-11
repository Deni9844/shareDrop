import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={1500} >
      {toasts.map(function ({ id, title, description, action,mode, ...props }) {
        return (
          <Toast key={id} {...props}  style={{backgroundColor: mode ? 'white' : '#181818'}}>
            <div className="grid gap-1">
              {title && <ToastTitle style={{color: mode ? 'black' : 'white'}}>{title}</ToastTitle>}
              {description && (
                <ToastDescription style={{color: mode ? 'black' : 'white'}}>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose style={{color: mode ? 'black' : 'white',top:"50%",transform:'translateY(-50%)'}}/>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
