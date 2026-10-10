"use client";

import { useState } from "react";
import { Button } from "../../Button";
import { Dialog, DialogPreview } from "../../Dialog";
import { DropdownMenu } from "../../DropdownMenu";
import { IconButton } from "../../IconButton";
import { Input } from "../../Input";
import { Select } from "../../Select";
import { Toast } from "../../Toast";
import { Tooltip } from "../../Tooltip";
import { GalleryDemo } from "../GalleryDemo";
import { useGalleryCopy } from "../useGalleryCopy";
import "./OverlaysDemo.css";

export function OverlaysDemo() {
  const copy = useGalleryCopy();
  const t = copy.overlays;
  const [open, setOpen] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  return (
    <>
      <GalleryDemo label={t.dialog} bare>
        <DialogPreview
          title={t.deleteTitle}
          description={t.deleteDescription}
          icon="trash"
          tone="destructive"
          onClose={() => undefined}
          footer={
            <>
              <Button variant="outline">{t.cancel}</Button>
              <Button variant="destructive">{t.delete}</Button>
            </>
          }
        />
      </GalleryDemo>
      <GalleryDemo label={t.dropdown}>
        <DropdownMenu
          label={t.account}
          trigger={t.options}
          items={[
            { type: "label", id: "account", label: t.account },
            { id: "profile", label: t.profile, icon: "user", shortcut: "⇧⌘P" },
            { id: "billing", label: t.billing, icon: "file", previewState: "hover" },
            { id: "settings", label: t.settings, icon: "sliders", shortcut: "⌘," },
            { type: "separator", id: "sep-1" },
            { id: "sidebar", label: t.showSidebar, checked: sidebar, onSelect: () => setSidebar((value) => !value) },
            { id: "export", label: t.exportData, icon: "download", disabled: true },
            { type: "separator", id: "sep-2" },
            { id: "logout", label: t.logOut, icon: "log-out" },
            { id: "delete", label: t.deleteAccount, icon: "trash", destructive: true },
          ]}
        />
      </GalleryDemo>
      <GalleryDemo label={t.tooltip}>
        <div className="dl-gallery-tooltips">
          <Tooltip content={t.copyLinkTip} open>
            <IconButton icon="link" label={t.copyLink} variant="outline" />
          </Tooltip>
          <Tooltip content={t.shortcutTip} side="bottom" open>
            <IconButton icon="search" label={copy.buttons.search} variant="outline" />
          </Tooltip>
          <Tooltip content={t.hoverTip}>
            <Button variant="ghost" size="sm">
              {t.hoverMe}
            </Button>
          </Tooltip>
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.toast}>
        <div className="dl-gallery-toasts">
          <Toast variant="success" title={t.savedTitle} description={t.savedDescription} onDismiss={() => undefined} />
          <Toast title={t.commentTitle} description={t.commentDescription} onDismiss={() => undefined} />
          <Toast variant="warning" title={t.trialTitle} description={t.trialDescription} action={{ label: t.upgrade }} />
          <Toast variant="destructive" title={t.uploadTitle} description={t.uploadDescription} action={{ label: t.retry }} />
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.dialogLive}>
        <div className="dl-gallery-row">
          <Button iconStart="users" onClick={() => setOpen(true)}>
            {t.openDialog}
          </Button>
        </div>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title={t.inviteTitle}
          description={t.inviteDescription}
          icon="mail"
          footer={
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={() => setOpen(false)}>{t.sendInvite}</Button>
            </>
          }
        >
          <div className="dl-gallery-form">
            <Input label={t.inviteEmail} type="email" placeholder={copy.forms.emailPlaceholder} />
            <Select label={t.inviteRole} defaultValue={t.roles[1]} options={t.roles.map((role) => ({ value: role, label: role }))} />
          </div>
        </Dialog>
      </GalleryDemo>
    </>
  );
}
