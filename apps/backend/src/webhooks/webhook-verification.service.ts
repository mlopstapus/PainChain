import { Injectable, UnauthorizedException, Logger } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'crypto'

@Injectable()
export class WebhookVerificationService {
  private readonly logger = new Logger(WebhookVerificationService.name)

  /**
   * Verify GitHub webhook signature using HMAC-SHA256
   * @param payload - Raw request body as Buffer
   * @param signature - Signature from X-Hub-Signature-256 header (format: "sha256=<hash>")
   * @param secret - Webhook secret
   */
  verifyGitHubSignature(
    payload: Buffer,
    signature: string | undefined,
    secret: string
  ): void {
    if (!signature) {
      this.logger.warn('GitHub webhook missing signature header')
      throw new UnauthorizedException('Missing signature header')
    }

    if (!signature.startsWith('sha256=')) {
      this.logger.warn('GitHub webhook invalid signature format')
      throw new UnauthorizedException('Invalid signature format')
    }

    const expectedSignature = signature.substring(7) // Remove 'sha256=' prefix
    const computedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    if (!this.timingSafeCompare(computedSignature, expectedSignature)) {
      this.logger.warn('GitHub webhook signature verification failed')
      throw new UnauthorizedException('Invalid signature')
    }

    this.logger.debug('GitHub webhook signature verified')
  }

  /**
   * Verify GitLab webhook token
   * @param token - Token from X-Gitlab-Token header
   * @param secret - Webhook secret
   */
  verifyGitLabToken(token: string | undefined, secret: string): void {
    if (!token) {
      this.logger.warn('GitLab webhook missing token header')
      throw new UnauthorizedException('Missing token header')
    }

    if (!this.timingSafeCompare(token, secret)) {
      this.logger.warn('GitLab webhook token verification failed')
      throw new UnauthorizedException('Invalid token')
    }

    this.logger.debug('GitLab webhook token verified')
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    const bufferA = Buffer.from(a, 'utf-8')
    const bufferB = Buffer.from(b, 'utf-8')

    return timingSafeEqual(bufferA, bufferB)
  }
}
