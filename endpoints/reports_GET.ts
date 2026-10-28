import superjson from "superjson";
import { db } from "../helpers/db";
import { requireOwnedBusiness } from "../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import { schema, type OutputType } from "./reports_GET.schema";
type Line = { name?: string; quantity?: number; unitPrice?: number; unitCost?: number | null };
export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
   10	    if (!subscriptionPlan.resolve(business).canUseReports) return new Response(superjson.stringify({error:"Reports and ROI are available on Premium."}),{status:402});
   11	    const url = new URL(request.url);
   12	    const input = schema.parse({from:url.searchParams.get("from") ?? undefined,to:url.searchParams.get("to") ?? undefined});
   13	    const now = new Date(); const to = input.to ? new Date(input.to) : now; const from = input.from ? new Date(input.from) : new Date(now.getTime()-30*86400000);
   14	    const orders = await db.selectFrom("orders").select(["items","createdAt","status"]).where("businessId","=",business.id).where("createdAt",">=",from).where("createdAt","<=",to).where("status","=","completed").execute();
   15	    let revenue=0,cogs=0,unitsSold=0; const by=new Map<string,{units:number;revenue:number;grossProfit:number}>();
   16	    for (const order of orders) for (const l of ((Array.isArray(order.items)?order.items:[]) as Line[])) {
   17	      const q=Math.max(0,Number(l.quantity)||0), price=Number(l.unitPrice)||0, cost=l.unitCost==null?null:Number(l.unitCost);
   18	      revenue += price*q; unitsSold += q; const name=l.name ?? "Unnamed item"; const v=by.get(name) ?? {units:0,revenue:0,grossProfit:0};
   19	      v.units += q; v.revenue += price*q; if(cost!=null){ cogs += cost*q; v.grossProfit += (price-cost)*q; } by.set(name,v);
   20	    }
   21	    const grossProfit=revenue-cogs;
   22	    const output:OutputType={from,to,revenue,cogs,grossProfit,grossMargin:revenue?grossProfit/revenue*100:null,roi:cogs?grossProfit/cogs*100:null,orderCount:orders.length,unitsSold,topProducts:[...by.entries()].filter(([,v])=>v.revenue>0).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,5).map(([name,v])=>({name,...v}))};
   23	    return new Response(superjson.stringify(output),{headers:{"Content-Type":"application/json"}});
   24	  } catch(e){ return new Response(superjson.stringify({error:e instanceof Error?e.message:"Could not load report."}),{status:400}); }
   25	}
