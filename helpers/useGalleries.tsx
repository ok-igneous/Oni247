import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {getGalleries} from "../endpoints/galleries/list_GET.schema";
import {postSaveGallery} from "../endpoints/galleries/save_POST.schema";
import {postDeleteGallery} from "../endpoints/galleries/delete_POST.schema";
const KEY=["galleries"] as const;
export const useGalleries=()=>{const qc=useQueryClient();const invalidate=()=>{void qc.invalidateQueries({queryKey:KEY});void qc.invalidateQueries({queryKey:["storefront"]});};return {list:useQuery({queryKey:KEY,queryFn:getGalleries,retry:false}),save:useMutation({mutationFn:postSaveGallery,onSuccess:invalidate}),remove:useMutation({mutationFn:postDeleteGallery,onSuccess:invalidate})};};
