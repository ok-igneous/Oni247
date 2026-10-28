import { useQuery } from "@tanstack/react-query";
import { getReports } from "../endpoints/reports_GET.schema";
export const useReports = ({from,to}:{from?:string;to?:string}) => useQuery({queryKey:["reports",from,to],queryFn:()=>getReports({from,to}),retry:false});
