import { Component } from '@angular/core';

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
  styleUrl: './landing-page.scss',
  templateUrl: './landing-page.html',
})
export class LandingPage {
  /** Replace with the canonical repository once it has a public remote. */
  protected readonly githubUrl = 'https://github.com/<owner>/opensurvey';

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
      title: 'No tracking, no upsell',
      description:
        'No analytics beacons, no feature gates, no pricing page. The complete tool is the free tool.',
    },
  ];

  protected readonly principles: readonly Principle[] = [
    {
      title: 'No tiers',
      description:
        'There is one edition of OpenSurvey and everybody gets it. Nothing is reserved for a plan that does not exist.',
    },
    {
      title: 'No response caps',
      description:
        'Collect ten answers or ten thousand. The only limit is the server you choose to run it on.',
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
        'git clone https://github.com/<owner>/opensurvey.git',
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
