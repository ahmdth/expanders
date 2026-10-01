import { Injectable } from '@nestjs/common';
import { html, type Mailable } from '@nestjs/mail';

export interface NewMatch {
  projectId: number;
  country: string;
  vendorName: string;
  score: number;
}

/** "A vendor was matched to your project". `html` escapes every interpolated value (vendor names are user data). */
@Injectable()
export class NewMatchMail implements Mailable<NewMatch> {
  render({ projectId, country, vendorName, score }: NewMatch) {
    return {
      subject: `New vendor match for your ${country} expansion project`,
      html: html` <p>Good news!</p>
        <p>
          <strong>${vendorName}</strong> was matched to project #${projectId}
          (${country}) with a score of <strong>${score}</strong>.
        </p>
        <p>The Expanders360 team</p>`,
    };
  }
}
