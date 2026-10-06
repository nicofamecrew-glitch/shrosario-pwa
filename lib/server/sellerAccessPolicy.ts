// Call only after auth.getUser(token) has validated the signed Supabase token.
export function sellerTokenAllowed(claims:any,user:{id:string;email?:string|null;email_confirmed_at?:string},emailOtpEnabled=false,now=Date.now()){
 if(!claims||claims.sub!==user.id||!Number.isFinite(claims.exp)||claims.exp*1000<=now)return false;
 if(claims.aal==='aal2')return true;
 return emailOtpEnabled&&claims.aal==='aal1'&&typeof user.email==='string'&&user.email.includes('@')&&Boolean(user.email_confirmed_at)&&claims.email===user.email&&Array.isArray(claims.amr)&&claims.amr.some((method:any)=>method?.method==='otp');
}
