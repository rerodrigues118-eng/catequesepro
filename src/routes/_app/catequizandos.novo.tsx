import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-lite";
import { CatequizandoForm } from "@/components/CatequizandoForm";

export const Route = createFileRoute("/_app/catequizandos/novo")({
  head: () => ({ meta: [{ title: "Novo cadastro — CatequesePRO" }] }),
  component: NovoPage,
});

function NovoPage() {
  return (
    <div>
      <PageHeader title="Novo cadastro" subtitle="Cadastre um novo catequizando" />
      <CatequizandoForm />
    </div>
  );
}
