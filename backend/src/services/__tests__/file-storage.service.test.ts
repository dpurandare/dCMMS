/**
 * REV-040: a client's declared Content-Type on a multipart upload is
 * attacker-controlled. Before this, FileStorageService trusted it outright
 * — uploading an arbitrary shell script or ELF binary with
 * `Content-Type: image/png` was accepted. Verified against a running
 * stack during the review; these are the fast, no-server unit-level
 * equivalent for regression.
 */
import { FileStorageService } from "../file-storage.service";

describe("FileStorageService.validateFileContent", () => {
  it("rejects a shell script disguised as image/png", () => {
    const shebang = Buffer.from("#!/bin/sh\necho pwned\n");
    expect(() =>
      FileStorageService.validateFileContent(shebang, "image/png"),
    ).toThrow(/executable or script signature/);
  });

  it("rejects an ELF binary disguised as image/png", () => {
    const elf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x01, 0x02, 0x03]);
    expect(() =>
      FileStorageService.validateFileContent(elf, "image/png"),
    ).toThrow(/executable or script signature/);
  });

  it("rejects a Windows PE/EXE disguised as application/pdf", () => {
    const pe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00");
    expect(() =>
      FileStorageService.validateFileContent(pe, "application/pdf"),
    ).toThrow(/executable or script signature/);
  });

  it("rejects content whose bytes don't match the declared type", () => {
    const plainText = Buffer.from("just some text, not a real PNG");
    expect(() =>
      FileStorageService.validateFileContent(plainText, "image/png"),
    ).toThrow(/does not match declared type/);
  });

  it("accepts a genuine PNG declared as image/png", () => {
    const realPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]);
    expect(() =>
      FileStorageService.validateFileContent(realPng, "image/png"),
    ).not.toThrow();
  });

  it("accepts a genuine PDF declared as application/pdf", () => {
    const realPdf = Buffer.from("%PDF-1.4\n...");
    expect(() =>
      FileStorageService.validateFileContent(realPdf, "application/pdf"),
    ).not.toThrow();
  });

  it("skips content-signature matching for text/plain and text/csv, but still rejects an executable signature", () => {
    const plain = Buffer.from("just plain text");
    expect(() =>
      FileStorageService.validateFileContent(plain, "text/plain"),
    ).not.toThrow();

    const elfAsCsv = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
    expect(() =>
      FileStorageService.validateFileContent(elfAsCsv, "text/csv"),
    ).toThrow(/executable or script signature/);
  });
});
