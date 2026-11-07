import { Pipe, PipeTransform } from '@angular/core';

import { PublishStatus } from '../../core/api/models';

const LABELS: Readonly<Record<PublishStatus, string>> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
};

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(status: PublishStatus): string {
    return LABELS[status];
  }
}
