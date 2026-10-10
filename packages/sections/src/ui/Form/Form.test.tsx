import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { contentContextFromDoc } from "../../context";
import { resolveSectionProps, storedDefaultProps } from "../../props";
import { acmeDoc } from "../../testing/fixtures";
import { renderSection } from "../../testing/renderSection";
import { fitInputFor } from "../testing/fitInput";
import { formSection } from "./definition";
import { fitForm } from "./fit";
import type { FormProps } from "./schema";

describe("ui.form", () => {
  it("guarda el conjunto de campos y muestra los del propósito, con etiquetas e ids por elemento", () => {
    const { props, container } = renderSection(formSection, { elementId: "b-form01" });
    expect((props.fields as unknown[]).length).toBe(11);
    expect(screen.getByLabelText(/Nombre/).id).toBe("b-form01-name");
    expect(screen.getByLabelText(/Correo electrónico/).getAttribute("type")).toBe("email");
    expect(container.querySelectorAll(".dl-ui-form__fields > *")).toHaveLength(4);
    expect(screen.getByRole("heading", { level: 2, name: "Tus datos" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enviar" }).getAttribute("type")).toBe("submit");
  });

  it("inicio de sesión: textos del propósito, contraseña actual y enlace secundario", () => {
    renderSection(formSection, { props: { purpose: "login", count: 3 }, locale: "en" });
    expect(screen.getByRole("heading", { name: "Sign in to Acme Cloud" })).toBeTruthy();
    expect(screen.getByLabelText(/Password/).getAttribute("autocomplete")).toBe("current-password");
    expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });

  it("los textos propios ganan al del propósito; vacío lo oculta", () => {
    renderSection(formSection, { props: { purpose: "signup", title: "", submit: "Empezar" } });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("button", { name: "Empezar" })).toBeTruthy();
    expect(screen.getByLabelText(/Contraseña/).getAttribute("autocomplete")).toBe("new-password");
  });

  it("un bloque enlazado envía a su pantalla en el HTML estático", () => {
    const content = contentContextFromDoc(acmeDoc());
    const resolved = resolveSectionProps(formSection, storedDefaultProps(formSection, content), content);
    const Section = formSection.Component;
    const { container } = render(
      <Section
        {...(resolved.props as FormProps)}
        variant={resolved.variant}
        elementId="b-form02"
        ctx={{ ...content, mode: "light", interactive: false, blockLink: () => "dashboard.html", linkTarget: () => "s-dash01" }}
      />,
    );
    expect(container.querySelector("form")?.getAttribute("action")).toBe("dashboard.html");
    expect(container.querySelector('button[type="submit"]')?.getAttribute("data-dl-screen-link")).toBe("s-dash01");
  });

  it("fit: propósito por la nota, campos del chip, tarjeta centrada para acceso", () => {
    expect(fitForm(fitInputFor("form", 6, 50, { note: "login" }))).toEqual({
      variant: "card",
      props: { purpose: "login", count: 4, frame: "plain" },
    });
    expect(fitForm(fitInputFor("form", 6, 50, { note: "formulario de contacto" }))).toMatchObject({
      variant: "plain",
      props: { purpose: "contact", frame: "card" },
    });
    expect(fitForm(fitInputFor("form", 12, 50, { note: "regístrate", kind: "landing" })).props).toMatchObject({ purpose: "signup", frame: "section" });
    expect(fitForm(fitInputFor("form", 6, 20)).props?.count).toBe(2);
  });
});
