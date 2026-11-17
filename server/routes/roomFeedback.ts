import { z } from 'zod'
import { AppError } from '../middleware/errors.js'
import type { Api } from './deps.js'

const schema = z.object({ interviewId: z.string().min(1).max(100), followed: z.boolean() })

/** The after-call tap. Log line only: nothing is stored. Durable storage would need a migration. */
export function registerRoomFeedbackRoutes(api: Api, log: (line: object) => void = line => console.log(JSON.stringify(line))): void {
  api.post('/room/feedback', async c => {
    const body = schema.parse(await c.req.json().catch(() => ({})))
    const interview = await c.get('repo').getInterview(c.get('workspace'), body.interviewId)
    if (!interview) throw new AppError(404, 'interview_not_found')
    log({ event: 'room_feedback', interviewId: interview.id, followed: body.followed })
    return c.body(null, 204)
  })
}
