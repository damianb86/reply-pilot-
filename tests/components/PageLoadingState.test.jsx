import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PageLoadingState from "../../src/PageLoadingState";

describe("PageLoadingState", () => {
  it("renders accessible loading copy", () => {
    render(<PageLoadingState title="Loading replies" description="Preparing the queue" />);

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Loading replies" })).toBeInTheDocument();
    expect(screen.getByText("Preparing the queue")).toBeInTheDocument();
  });
});
