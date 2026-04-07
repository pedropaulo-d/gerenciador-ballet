import { Suspense } from "react";
import { FinancesList } from "./finances-list";

export default function FinancesPage() {
  return (
    <Suspense>
      <FinancesList />
    </Suspense>
  );
}
