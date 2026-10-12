import { StateBlock } from "../../components/ui/StateBlock";

type DesignSystemPageProps = {
  title: string;
};

export function DesignSystemPage({ title }: DesignSystemPageProps) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Prepared route</p>
          <h1>{title}</h1>
          <p>
            This route is wired into the application shell so later prompts can add
            the real workflow without changing the navigation architecture.
          </p>
        </div>
      </section>
      <StateBlock title="Ready for next implementation stage">
        The foundation includes shared layout, tokens, state patterns, and demo data boundaries.
      </StateBlock>
    </div>
  );
}
