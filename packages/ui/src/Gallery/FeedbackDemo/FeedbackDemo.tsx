"use client";

import { Alert } from "../../Alert";
import { Button } from "../../Button";
import { Progress } from "../../Progress";
import { Skeleton } from "../../Skeleton";
import { useUiStrings } from "../../UiProvider";
import { VisuallyHidden } from "../../VisuallyHidden";
import { GalleryDemo } from "../GalleryDemo";
import { useGalleryCopy } from "../useGalleryCopy";
import "./FeedbackDemo.css";

export function FeedbackDemo() {
  const strings = useUiStrings();
  const t = useGalleryCopy().feedback;
  return (
    <>
      <GalleryDemo label={t.alerts} span="full">
        <Alert
          variant="info"
          title={t.infoTitle}
          action={
            <Button size="sm" variant="outline">
              {t.reload}
            </Button>
          }
        >
          {t.infoBody}
        </Alert>
        <Alert variant="success" title={t.successTitle}>
          {t.successBody}
        </Alert>
        <Alert variant="warning" title={t.warningTitle}>
          {t.warningBody}
        </Alert>
        <Alert variant="destructive" title={t.errorTitle} onDismiss={() => undefined}>
          {t.errorBody}
        </Alert>
        <Alert>{t.neutralBody}</Alert>
      </GalleryDemo>
      <GalleryDemo label={t.progress}>
        <Progress label={t.uploading} value={64} showValue />
        <Progress label={t.profile} value={100} showValue variant="success" />
        <Progress label={t.storage} value={86} max={100} valueText={t.storageText} showValue variant="warning" size="lg" />
        <Progress label={t.processing} size="sm" />
      </GalleryDemo>
      <GalleryDemo label={t.skeleton}>
        <div className="dl-gallery-skeleton" role="status" aria-busy="true">
          <VisuallyHidden>{strings.loading}</VisuallyHidden>
          <div className="dl-gallery-skeleton__head">
            <Skeleton shape="circle" />
            <Skeleton shape="text" lines={2} />
          </div>
          <Skeleton shape="rect" />
          <Skeleton shape="text" lines={3} />
        </div>
      </GalleryDemo>
    </>
  );
}
