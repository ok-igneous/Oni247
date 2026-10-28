import superjson from "superjson";
export type OutputType={message:string};
export const postSendVerification=async(init?:RequestInit):Promise<OutputType>=>{const result=await fetch("/_api/auth/send_verification",{method:"POST",body:superjson.stringify({}),...init,headers:{"Content-Type":"application/json",...(init?.headers??{})},credentials:"include"});const data=superjson.parse<OutputType & {message?:string}>(await result.text());if(!result.ok)throw new Error(data.message||"Could not send verification email.");return data;};
