import { z } from 'zod'
import { AppError } from '../middleware/errors.js'
import type { Api, RouteDeps } from './deps.js'

const text = (max: number) => z.string().trim().max(max)
const storySchema = z.object({
  title: text(200).min(1),
  // ponytail: the 12-theme cap belongs to the stories feature; this only bounds the payload.
  themes: z.array(text(60).min(1)).max(50),
  situation: text(2000),
  task: text(2000),
  action: text(2000),
  result: text(2000),
  quote: text(4000).nullable(),
  question: text(500).nullable(),
  sourceInterviewId: text(80).nullable(),
  sourceTurnId: text(80).nullable(),
})

/** Plain CRUD for the story bank. Theme logic and suggestions belong to the stories feature. */
export function registerStoriesRoutes(api: Api, { repo }: RouteDeps): void {
  api.get('/stories', async c => c.json(await repo.listStories(c.get('workspace'))))

  api.post('/stories', async c => {
    const body = storySchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await repo.createStory(c.get('workspace'), body), 201)
  })

  api.delete('/stories', async c => {
    await repo.deleteAllStories(c.get('workspace'))
    return c.body(null, 204)
  })

  api.get('/stories/:id', async c => {
    const story = await repo.getStory(c.get('workspace'), c.req.param('id'))
    if (!story) throw new AppError(404, 'story_not_found')
    return c.json(story)
  })

  api.patch('/stories/:id', async c => {
    const patch = storySchema.partial().parse(await c.req.json().catch(() => ({})))
    const story = await repo.updateStory(c.get('workspace'), c.req.param('id'), patch)
    if (!story) throw new AppError(404, 'story_not_found')
    return c.json(story)
  })

  api.delete('/stories/:id', async c => {
    await repo.deleteStory(c.get('workspace'), c.req.param('id'))
    return c.body(null, 204)
  })
}
