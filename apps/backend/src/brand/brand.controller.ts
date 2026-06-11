import { Controller, Get, Header, NotFoundException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { BrandService } from './brand.service';

const STATIC_CACHE = 'public, max-age=31536000, immutable';

/**
 * Serves the uploaded brand image at the favicon / logo routes.
 * 404 when no brand image has been uploaded (frontend renders its own default).
 */
@Controller()
export class BrandController {
  constructor(private readonly brand: BrandService) {}

  @Get(['favicon.ico', 'favicon.png', 'logo'])
  serve(@Res() res: Response): void {
    const img = this.brand.findBrandImage();
    if (!img) throw new NotFoundException();
    res.setHeader('Content-Type', this.brand.contentTypeFor(img));
    res.setHeader('Cache-Control', STATIC_CACHE);
    createReadStream(img).pipe(res);
  }
}
