import { getActiveContent } from "@/lib/content";
import ScanWizard from "@/components/scan/ScanWizard";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const themes = await getActiveContent();
  return <ScanWizard themes={themes} />;
}
