import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useDb } from "@/lib/db";
import { PageHeader } from "@/components/ui-lite";
import { CatequizandoForm } from "@/components/CatequizandoForm";

export const Route = createFileRoute("/_app/catequizandos/$id/editar")({
  head: () => ({ meta: [{ title: "Editar — CatequesePRO" }] }),
  component: EditarPage,
});

function EditarPage() {
  const { id } = Route.useParams();
  const { db } = useDb();
  const existing = db.catequizandos.find((c) => c.id === id);
  if (!existing) return <Navigate to="/catequizandos" replace />;
  return (
    <div>
      <PageHeader title="Editar catequizando" subtitle={existing.nome} />
      <CatequizandoForm existing={existing} />
    </div>
  );
}
