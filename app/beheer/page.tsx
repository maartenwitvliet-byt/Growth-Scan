import { getAllContent } from "@/lib/content";
import ContentEditor from "@/components/beheer/ContentEditor";

export const dynamic = "force-dynamic";

export default async function BeheerPage() {
  const { themes, statements } = await getAllContent();
  return <ContentEditor initialThemes={themes} initialStatements={statements} />;
}
