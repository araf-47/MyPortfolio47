import { Injectable, signal } from '@angular/core';

export interface CvRequestResult {
  ok: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CvRequestService {
  private readonly endpoint = 'https://api.web3forms.com/submit';
  private readonly accessKey = '042619d8-230a-404a-9eb8-5eff6dcb369c';

  /** Whether the CV request modal is currently open. */
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  async submitCvRequest(requesterEmail: string, note = ''): Promise<CvRequestResult> {
    const cleanEmail = requesterEmail.trim();
    const cleanNote = note.trim();

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: this.accessKey,
          from_name: 'Portfolio CV Request',
          subject: `Resume Request from ${cleanEmail}`,
          email: cleanEmail,
          replyto: cleanEmail,
          botcheck: false,
          message:
            `Hey Araf,\n\nSomeone is asking for your resume!\n\nEmail Address: ${cleanEmail}` +
            (cleanNote ? `\nNote: ${cleanNote}` : '') +
            `\n\nHit Reply to send them your CV.`,
        }),
      });

      let data: { success?: boolean; message?: string } = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        return {
          ok: false,
          error: data.message || 'Could not submit your request. Please try again.',
        };
      }

      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'Network error while sending request. Please try again.',
      };
    }
  }
}