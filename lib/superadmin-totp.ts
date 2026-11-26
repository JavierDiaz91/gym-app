import "server-only";
import { randomBytes, createCipheriv, createDecipheriv, createHmac, timingSafeEqual } from "node:crypto";

function key() {
 const value=process.env.KIVRA_TOTP_ENCRYPTION_KEY;
 if(!value || !/^[a-fA-F0-9]{64}$/.test(value)) throw new Error("Invalid TOTP encryption configuration");
 return Buffer.from(value,"hex");
}
export function encryptSecret(secret:Buffer,userId:number) {
 const iv=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",key(),iv);
 cipher.setAAD(Buffer.from("kivra-totp-v1:"+userId));
 const data=Buffer.concat([cipher.update(secret),cipher.final()]);
 return ["v1",iv.toString("hex"),cipher.getAuthTag().toString("hex"),data.toString("hex")].join(":");
}
export function decryptSecret(value:string,userId:number) {
 const [version,iv,tag,data,...rest]=value.split(":");
 if(version!=="v1"||rest.length||! /^[a-f0-9]{24}$/.test(iv)||! /^[a-f0-9]{32}$/.test(tag)||! /^[a-f0-9]{40}$/.test(data)) throw new Error("Invalid TOTP secret");
 const cipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"hex"));
 cipher.setAAD(Buffer.from("kivra-totp-v1:"+userId));
 cipher.setAuthTag(Buffer.from(tag,"hex"));
 return Buffer.concat([cipher.update(Buffer.from(data,"hex")),cipher.final()]);
}
export function generateSecret(){return randomBytes(20);}
export function base32(secret:Buffer){
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
 let bits=0,value=0,out="";
 for(const byte of secret){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}
 if(bits)out+=alphabet[(value<<(5-bits))&31];
 return out;
}
export function provisioningUri(secret:Buffer,email:string){
 return "otpauth://totp/"+encodeURIComponent("Kivra:"+email)+"?secret="+base32(secret)+"&issuer=Kivra&algorithm=SHA1&digits=6&period=30";
}
export function matchingStep(secret:Buffer,code:string,now=Date.now()){
 if(!/^\d{6}$/.test(code))return null;
 const step=Math.floor(now/30000);
 for(const candidate of [step,step-1,step+1]){
 if(candidate<0)continue;
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(candidate));
 const digest=createHmac("sha1",secret).update(counter).digest();
 const offset=digest[digest.length-1]&15;
 const expected=String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,"0");
 if(timingSafeEqual(Buffer.from(expected),Buffer.from(code)))return candidate;
 }
 return null;
}
export function generateRecoveryCodes(){return Array.from({length:10},()=>randomBytes(16).toString("hex"));}
export function recoveryHash(code:string,userId:number){
 return createHmac("sha256",key()).update("kivra-recovery-v1:"+userId+":"+code.trim().toLowerCase()).digest("hex");
}
