import {NowRequest, NowResponse} from "@now/node";

export default async function handle(req: NowRequest, res: NowResponse) {
  const chatid = req.query.chatid!;
  
}
