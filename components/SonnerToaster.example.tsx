import { Example } from "@floot/examples";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { SonnerToaster } from "./SonnerToaster";
import { Button } from "./Button";

export default function SonnerToasterShowcase() {
  return (
    <>
   10	      <h1>SonnerToaster</h1>
   11	      <p>
   12	        The host that renders toast notifications raised by the{" "}
   13	        <code>toast</code> function from <code>sonner</code>. It is already
   14	        mounted by the global providers, so an app should not render it again.
   15	      </p>
   16	
   17	      <h2>Toast variants</h2>
   18	      <div
   19	        style={{
   20	          display: "flex",
   21	          flexWrap: "wrap",
   22	          gap: "1rem",
   23	          alignItems: "flex-start",
   24	        }}
   25	      >
   26	        <Example title="Success">
   27	          <Button
   28	            onClick={() => {
   29	              toast.success("Success Toast", {
   30	                description: "This is a success toast message",
   31	                icon: <CheckCircle2 size={20} />,
   32	                action: { label: "Action", onClick: () => {} },
   33	                cancel: { label: "Cancel", onClick: () => {} },
   34	                closeButton: true,
   35	              });
   36	            }}
   37	          >
   38	            Success
   39	          </Button>
   40	        </Example>
   41	
   42	        <Example title="Error">
   43	          <Button
   44	            onClick={() => {
   45	              toast.error("Error Toast", {
   46	                description: "This is an error toast message",
   47	                icon: <AlertCircle size={20} />,
   48	                action: { label: "Action", onClick: () => {} },
   49	                cancel: { label: "Cancel", onClick: () => {} },
   50	                closeButton: true,
   51	              });
   52	            }}
   53	          >
   54	            Error
   55	          </Button>
   56	        </Example>
   57	
   58	        <Example title="Warning">
   59	          <Button
   60	            onClick={() => {
   61	              toast.warning("Warning Toast", {
   62	                description: "This is a warning toast message",
   63	                icon: <AlertTriangle size={20} />,
   64	                action: { label: "Action", onClick: () => {} },
   65	                cancel: { label: "Cancel", onClick: () => {} },
   66	                closeButton: true,
   67	              });
   68	            }}
   69	          >
   70	            Warning
   71	          </Button>
   72	        </Example>
   73	
   74	        <Example title="Info">
   75	          <Button
   76	            onClick={() => {
   77	              toast.info("Info Toast", {
   78	                description: "This is an info toast message",
   79	                icon: <Info size={20} />,
   80	                action: { label: "Action", onClick: () => {} },
   81	                cancel: { label: "Cancel", onClick: () => {} },
   82	                closeButton: true,
   83	              });
   84	            }}
   85	          >
   86	            Info
   87	          </Button>
   88	        </Example>
   89	      </div>
   90	
   91	      <SonnerToaster closeButton={false} />
   92	    </>
   93	  );
   94	}
   95	
