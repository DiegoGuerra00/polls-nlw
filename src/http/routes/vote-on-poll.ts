import z from "zod"
import { randomUUID } from "node:crypto"
import { prisma } from "../../lib/prista"
import { FastifyInstance } from "fastify"

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid()
    })

    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    })

    const { pollOptionId, } = voteOnPollBody.parse((request.body))
    const { pollId, } = voteOnPollParams.parse((request.params))


    let { sessionId } = request.cookies

    if (sessionId) {
      const userPreviousOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId,
          }
        }
      })

      if (userPreviousOnPoll && userPreviousOnPoll.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: { id: userPreviousOnPoll.id }
        })
      } else if (userPreviousOnPoll) {

        return reply.status(400).send({ message: 'You already voted on this poll.' })
      }
    }

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true,
      })
    }


    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId,
      }
    })

    return reply.code(201).send()
  })
}
