import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Receipt, Tags } from "lucide-react";
import QuotesPanel from "./QuotesPanel";
import InvoicesPanel from "./InvoicesPanel";
import BillingServicesPanel from "./BillingServicesPanel";

const BillingManagement = () => (
  <Tabs defaultValue="quotes">
    <TabsList className="mb-4">
      <TabsTrigger value="quotes" className="gap-2">
        <FileText className="h-4 w-4" />
        Devis
      </TabsTrigger>
      <TabsTrigger value="invoices" className="gap-2">
        <Receipt className="h-4 w-4" />
        Factures
      </TabsTrigger>
      <TabsTrigger value="services" className="gap-2">
        <Tags className="h-4 w-4" />
        Services &amp; Tarifs
      </TabsTrigger>
    </TabsList>
    <TabsContent value="quotes">
      <QuotesPanel />
    </TabsContent>
    <TabsContent value="invoices">
      <InvoicesPanel />
    </TabsContent>
    <TabsContent value="services">
      <BillingServicesPanel />
    </TabsContent>
  </Tabs>
);

export default BillingManagement;
