import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Feature {
  readonly title: string;
  readonly description: string;
  readonly icon: 'builder' | 'share' | 'chart' | 'server' | 'stack' | 'shield';
}

interface Principle {
  readonly title: string;
  readonly description: string;
}

interface Step {
  readonly title: string;
  readonly description: string;
  readonly commands: readonly string[];
}

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  styleUrl: './landing-page.scss',
  templateUrl: './landing-page.html',
})
export class LandingPage {
  protected readonly githubUrl = 'https://github.com/jonathan-lee-devel/opensurvey';

  protected readonly features: readonly Feature[] = [
    {
      icon: 'builder',
      title: 'Survey builder',
      description:
        'Compose surveys from multiple-choice, rating, and free-text questions. Reorder, branch, and preview before you publish.',
    },
    {
      icon: 'share',
      title: 'Share a link',
      description:
        'Every survey gets a clean public URL. Respondents never need an account, and you can close it whenever you like.',
    },
    {
      icon: 'chart',
      title: 'Live results',
      description:
        'Watch responses arrive in real time with per-question summaries, and export the raw rows as CSV at any point.',
    },
    {
      icon: 'server',
      title: 'Self-host anywhere',
      description:
        'One API, one static bundle. Run it on a laptop, a VPS, or a container platform. Your responses stay on your infrastructure.',
    },
    {
      icon: 'stack',
      title: 'A stack you already know',
      description:
        'A NestJS backend and an Angular frontend, both in TypeScript. Small enough to read in an afternoon and easy to extend.',
    },
    {
      icon: 'shield',
      title: 'No tracking, no phone-home',
      description:
        'No analytics beacons and no calls to outside services. The app only talks to the API you deploy.',
    },
  ];

  protected readonly principles: readonly Principle[] = [
    {
      title: 'Your infrastructure',
      description:
        'Deploy on a laptop, a VPS, or a container platform. Responses live in a database you run, under rules you set.',
    },
    {
      title: 'Your code',
      description:
        'OpenSurvey is MIT licensed. Read it, fork it, change it, and redistribute it. The only ask is that the copyright notice travels with it.',
    },
    {
      title: 'No lock-in',
      description:
        'Your data lives in your database. Export it, migrate it, or delete it without asking anyone for permission.',
    },
  ];

  protected readonly steps: readonly Step[] = [
    {
      title: 'Clone and install',
      description: 'The API and the web app are separate packages. Install dependencies for both.',
      commands: [
        'git clone https://github.com/jonathan-lee-devel/opensurvey.git',
        'cd opensurvey',
        '(cd api && yarn install)',
        '(cd web && yarn install)',
      ],
    },
    {
      title: 'Start the API',
      description: 'The API reads an .env file. An empty one is fine for local development.',
      commands: ['cd api', 'touch .env', 'yarn start:dev'],
    },
    {
      title: 'Start the web app',
      description: 'The dev server runs on port 4200 and reloads as you edit.',
      commands: ['cd web', 'yarn start'],
    },
  ];
}
