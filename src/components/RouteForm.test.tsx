// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteForm } from "./RouteForm";

const currencies = ["EUR", "GBP", "JPY", "USD", "USDC"];

afterEach(() => {
  cleanup();
});

describe("RouteForm", () => {
  it("blocks submission when source and target match", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<RouteForm currencies={currencies} isLoading={false} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText("Target"), "GBP");
    await user.click(screen.getByRole("button", { name: "Find routes" }));

    expect(screen.getByText("Source and target currencies must be different.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submission for non-positive amounts", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<RouteForm currencies={currencies} isLoading={false} onSubmit={onSubmit} />);

    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "0");
    await user.click(screen.getByRole("button", { name: "Find routes" }));

    expect(screen.getByText("Enter an amount greater than zero.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits normalized route search input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<RouteForm currencies={currencies} isLoading={false} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText("Source"), "USD");
    await user.selectOptions(screen.getByLabelText("Target"), "USDC");
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "2500.75");
    await user.selectOptions(screen.getByLabelText("Rails"), "stablecoin");
    await user.click(screen.getByRole("button", { name: "Find routes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      sourceCurrency: "USD",
      targetCurrency: "USDC",
      amount: 2500.75,
      railFilter: "stablecoin",
    });
  });

  it("disables search while quotes are loading", () => {
    render(<RouteForm currencies={currencies} isLoading onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Loading quotes..." })).toBeDisabled();
  });
});
