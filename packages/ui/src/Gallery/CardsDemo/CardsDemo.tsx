"use client";

import { AvatarGroup } from "../../Avatar";
import { Badge } from "../../Badge";
import { Button } from "../../Button";
import { Card, CardBody, CardFooter, CardHeader } from "../../Card";
import { Icon } from "../../Icon";
import { IconButton } from "../../IconButton";
import { PEOPLE } from "../AvatarsDemo";
import { GalleryDemo } from "../GalleryDemo";
import { useGalleryCopy } from "../useGalleryCopy";
import "./CardsDemo.css";

export function CardsDemo() {
  const copy = useGalleryCopy();
  const t = copy.cards;
  return (
    <>
      <GalleryDemo label={t.basic} bare>
        <Card>
          <CardHeader title={t.proTitle} description={t.proDescription} />
          <CardBody>
            <p className="dl-gallery-price">
              <span className="dl-gallery-price__amount">{t.proPrice}</span>
              <span className="dl-gallery-price__period">{t.proPeriod}</span>
            </p>
            <ul className="dl-gallery-features">
              {t.proFeatures.map((feature) => (
                <li key={feature}>
                  <Icon name="check" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardBody>
          <CardFooter>
            <Button fullWidth>{t.upgrade}</Button>
          </CardFooter>
        </Card>
      </GalleryDemo>
      <GalleryDemo label={t.withActions} bare>
        <Card as="article">
          <CardHeader
            title={t.reportTitle}
            description={t.reportDescription}
            action={<IconButton icon="more" label={t.moreActions} size="sm" />}
          />
          <CardBody>
            <p className="dl-gallery-card-text">{t.reportBody}</p>
          </CardBody>
          <CardFooter align="between" divider>
            <AvatarGroup label={copy.avatars.team} items={PEOPLE.slice(0, 5).map((name) => ({ name }))} size="sm" max={3} />
            <Badge variant="success" dot>
              {t.shared}
            </Badge>
          </CardFooter>
        </Card>
      </GalleryDemo>
      <GalleryDemo label={t.interactive} bare>
        <Card interactive>
          <CardHeader
            title={
              <a className="dl-gallery-card-link" href="#">
                {t.templateTitle}
              </a>
            }
            description={t.templateDescription}
            action={<Icon name="arrow-up-right" />}
          />
          <CardBody>
            <p className="dl-gallery-card-text">{t.templateBody}</p>
          </CardBody>
        </Card>
        <Card interactive previewState="hover">
          <CardHeader title={t.templateTitle} description={`${copy.states.hover} · ${t.templateDescription}`} />
        </Card>
      </GalleryDemo>
      <GalleryDemo label={t.muted} bare>
        <Card variant="muted">
          <CardHeader title={t.tipTitle} titleAs="h4" />
          <CardBody>
            <p className="dl-gallery-card-text">{t.tipBody}</p>
          </CardBody>
        </Card>
        <Card variant="outline">
          <CardHeader title={t.proTitle} description={t.proDescription} titleAs="h4" />
          <CardFooter>
            <Button variant="outline" size="sm">
              {t.details}
            </Button>
          </CardFooter>
        </Card>
      </GalleryDemo>
    </>
  );
}
