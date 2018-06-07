const TeamSpeakClient = require('node-teamspeak')
const util = require('util')
const bluebird = require('bluebird')
const fs = bluebird.promisifyAll(require('fs'))
const _ = require('lodash')

const TS_HOST = process.env.TS_HOST
const TS_NAME = process.env.TS_NAME
const TS_PASSWORD = process.env.TS_PASSWORD
const CHANNEL_PREFIX = process.env.CHANNEL_PREFIX || 'Meme of the Hour'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const readRandomMeme = async memeFiles => {}

const cl = bluebird.promisifyAll(new TeamSpeakClient(TS_HOST))
;(async () => {
  const memeFiles = await fs.readdirAsync(__dirname + '/memes')

  await cl.sendAsync('login', {
    client_login_name: TS_NAME,
    client_login_password: TS_PASSWORD
  })
  await cl.sendAsync('use', { sid: 1 })

  let memes = []

  while (true) {
    const channelList = await cl.sendAsync('channellist')
    const memechat = channelList.find(
      channel => channel.channel_name.indexOf(CHANNEL_PREFIX) === 0
    )

    const parts = channelList.filter(channel => channel.pid === memechat.cid)

    for (const part of parts) {
      await cl.sendAsync('channeldelete', {
        cid: part.cid,
        force: 1
      })
    }

    if (memes.length === 0) {
      memes = _.shuffle(memeFiles)
    }

    const file = memes.pop()

    const text = await fs.readFileAsync(`${__dirname}/memes/${file}`, 'utf8')
    const newMeme = text.split('\n').filter(row => row.trim().length > 0)

    const usedLines = []

    let extra = 0

    for (let line of newMeme) {
      while (usedLines.indexOf(line) !== -1) {
        line += extra
        extra++
      }

      usedLines.push(line)

      await cl.sendAsync('channelcreate', {
        channel_name: line,
        cpid: memechat.cid,
        // channel_maxclients: 0,
        channel_flag_permanent: true
      })
    }

    const nextHour = new Date()
    nextHour.setMinutes(0, 0, 0)
    nextHour.setHours(nextHour.getHours() + 1)

    const nextMemeMs = nextHour.getTime() - Date.now()

    console.log(`Next meme in ${nextMemeMs} ms`)

    await sleep(nextMemeMs)
  }
})().catch(err => console.error(err))
