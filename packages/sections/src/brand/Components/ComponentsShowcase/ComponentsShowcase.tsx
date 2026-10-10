import {
  AvatarGroup,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Icon,
  IconButton,
  Input,
  Select,
  Switch,
  Table,
  type BadgeVariant,
  type TableColumn,
} from "@dialmade/ui";
import { heroCopy, personNames, pricingPlans, rngFor, tableData, type TableRow, type Tone } from "../../../content";
import type { RenderContext } from "../../../types";
import { BoardPanel } from "../../BoardPanel";
import { COMPONENTS_COPY } from "../copy";
import "./ComponentsShowcase.css";

export interface ComponentsShowcaseProps {
  ctx: RenderContext;
  showTable: boolean;
}

const TONE_VARIANT: Record<Tone, BadgeVariant> = {
  success: "success",
  warning: "warning",
  info: "info",
  destructive: "destructive",
  neutral: "neutral",
};

/** The kit with the brand: buttons, a form, badges and avatars, a plan card and a short table. */
export function ComponentsShowcase({ ctx, showTable }: ComponentsShowcaseProps) {
  const copy = COMPONENTS_COPY[ctx.locale];
  const hero = heroCopy(ctx);
  const { plans } = pricingPlans(ctx);
  const plan = plans.find((candidate) => candidate.highlighted) ?? plans[0];
  const people = personNames(rngFor(ctx.seed, "brand-components"), ctx.locale, 6).map((name) => ({ name }));

  const data = tableData(ctx, 4);
  const status = data.columns.find((column) => column.kind === "status");
  const columns = [...data.columns.filter((column) => column !== status).slice(0, status ? 3 : 4), ...(status ? [status] : [])];
  const tableColumns: TableColumn<TableRow>[] = columns.map((column, index) => ({
    key: column.key,
    header: column.label,
    align: column.align,
    rowHeader: index === 0,
    cell: (row) => {
      const cell = row.cells[column.key];
      if (!cell) return null;
      return cell.tone ? (
        <Badge variant={TONE_VARIANT[cell.tone]} dot>
          {cell.text}
        </Badge>
      ) : (
        cell.text
      );
    },
  }));

  return (
    <div className="dl-brand-showcase">
      <BoardPanel label={copy.buttons} className="dl-brand-showcase__panel" data-area="buttons">
        <div className="dl-brand-showcase__row">
          <Button variant="primary">{hero.primaryCta}</Button>
          <Button variant="secondary">{hero.secondaryCta}</Button>
          <Button variant="outline">{copy.more}</Button>
          <Button variant="ghost">{copy.search}</Button>
        </div>
        <div className="dl-brand-showcase__row">
          <Button variant="cta" size="lg" iconEnd="arrow-right">
            {hero.primaryCta}
          </Button>
          <Button variant="primary" size="sm" iconStart="plus">
            {copy.create}
          </Button>
          <Button variant="destructive" size="sm" iconStart="trash">
            {copy.delete}
          </Button>
          <Button variant="secondary" size="sm" disabled>
            {copy.disabled}
          </Button>
          <IconButton icon="more" label={copy.more} variant="outline" />
        </div>
      </BoardPanel>

      <BoardPanel label={copy.badges} className="dl-brand-showcase__panel" data-area="badges">
        <div className="dl-brand-showcase__row">
          <Badge variant="success" dot>
            {copy.statuses.active}
          </Badge>
          <Badge variant="warning" dot>
            {copy.statuses.pending}
          </Badge>
          <Badge variant="info">{copy.statuses.fresh}</Badge>
          <Badge variant="destructive">{copy.statuses.overdue}</Badge>
          <Badge variant="neutral">{copy.statuses.draft}</Badge>
          <Badge variant="default" appearance="solid" icon="sparkle">
            {copy.statuses.beta}
          </Badge>
        </div>
        <AvatarGroup label={copy.team} items={people} max={4} />
      </BoardPanel>

      <BoardPanel label={copy.form} className="dl-brand-showcase__panel" data-area="form">
        <div className="dl-brand-showcase__form">
          <Input
            label={copy.email}
            type="email"
            placeholder={copy.emailPlaceholder}
            hint={copy.emailHint}
            iconStart="mail"
            autoComplete="off"
          />
          <Input label={copy.company} error={copy.companyError} autoComplete="off" />
          <Select
            label={copy.plan}
            options={plans.map((option) => ({ value: option.id, label: option.name }))}
            defaultValue={plan?.id}
          />
          <Switch label={copy.notifications} defaultChecked />
          <Checkbox label={copy.terms} defaultChecked />
        </div>
      </BoardPanel>

      {plan && (
        <div className="dl-brand-showcase__panel dl-brand-showcase__card" data-area="card">
          <Card as="article">
            <CardHeader
              title={plan.name}
              description={plan.description}
              titleAs="h3"
              action={plan.highlighted ? <Badge variant="default">{copy.popular}</Badge> : undefined}
            />
            <CardBody>
              <p className="dl-brand-showcase__price">
                <span>{plan.priceLabel}</span>
                {plan.period && <span className="dl-brand-showcase__period">{plan.period}</span>}
              </p>
              <ul className="dl-brand-showcase__features">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature}>
                    <Icon name="check" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
            <CardFooter>
              <Button variant="primary" fullWidth>
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {showTable && (
        <div className="dl-brand-showcase__panel" data-area="table">
          <Table caption={data.title} columns={tableColumns} rows={data.rows} getRowKey={(row) => row.id} />
        </div>
      )}
    </div>
  );
}
