#!/usr/bin/env node
const Shell = require('shell')
const axios = require('axios').default
const URL = require('url').URL
const fs = require('fs')
const { exec } = require('child_process')

const appsettings = {
  choirlessAPI: 'http://localhost:3000',
  path: [],
  pathids: [],
  user: null,
  choir: null,
  song: null,
  autocomplete: []
}

const callAPI = async (method, path, body, qs) => {
  const opts = {
    method: method,
    baseURL: appsettings.choirlessAPI,
    url: path,
    params: qs,
    data: body,
    responseType: 'json'
  }
  try {
    const response = await axios.request(opts)
    return response.data
  } catch (e) {
    throw (new Error(e))
  }
}

// download a file using axios
const downloadFile = async (url, filename) => {
  const writer = fs.createWriteStream(filename)
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })
  response.data.pipe(writer)
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

// progress meter
const progress = (message, p, ptotal, last) => {
  const squares = Math.floor((p / ptotal) * 20)
  const block = String.fromCharCode(0x25a0)
  const emptyBlock = String.fromCharCode(0x25a1)
  const str = '  ' + message.padEnd(34) + block.repeat(squares).padEnd(20, emptyBlock) + ' ' + p + '/' + ptotal
  const endline = last ? '\n' : '\r'
  process.stdout.write(str + endline)
}

// Initialization
const completer = require('./completer.js')
const app = new Shell({ chdir: __dirname })
// Middleware registration
app.configure(function () {
  app.use(function (req, res, next) {
    next()
  })
  app.use(Shell.history({
    shell: app
  }))
  app.use(completer({
    shell: app,
    appsettings: appsettings
  }))
  app.use(Shell.router({
    shell: app
  }))
  app.use(Shell.help({
    shell: app,
    introduction: true
  }))
})

const formatPath = () => {
  return appsettings.path.join('/') + ' >> '
}

const formatOffset = (offset) => {
  if (typeof offset === 'string') {
    offset = parseFloat(offset)
  }
  return offset.toFixed(0)
}

const formatDate = (date) => {
  const d = new Date(date)
  return d.toISOString().substr(0, 10)
}

// change to parent directory
app.cmd('cd ..', 'change to parent directory', function (req, res, next) {
  if (appsettings.path.length > 0) {
    appsettings.path.pop()
    appsettings.pathids.pop()
    appsettings.autocomplete = []
  }
  app.set('prompt', formatPath())
  res.prompt()
})

// change to top directory
app.cmd('cd ~', 'change to root directory', function (req, res, next) {
  appsettings.path = []
  appsettings.pathids = []
  appsettings.autocomplete = []
  app.set('prompt', formatPath())
  res.prompt()
})

// change to top directory
app.cmd('cd /', 'change to root directory', function (req, res, next) {
  appsettings.path = []
  appsettings.pathids = []
  appsettings.autocomplete = []
  app.set('prompt', formatPath())
  res.prompt()
})

// jump to specific /choir/song from a Choirless URL
app.cmd('url :url', 'set url', async function (req, res, next) {
  let u

  // parse
  try {
    u = new URL(req.params.url)
  } catch (e) {
    res.red('invalid URL\n')
    return res.prompt()
  }

  // check hostname
  if (u.host !== 'www.choirless.com') {
    res.red('non-Choirless URL\n')
    return res.prompt()
  }

  // split path
  const bits = u.pathname.split('/')
  if (bits[0] !== '' || bits[1] !== 'dashboard' || bits[2] !== 'choir' || bits[4] !== 'song') {
    res.red('must be Choirless song URL\n')
    return res.prompt()
  }

  // get choirId, songId
  const choirId = bits[3]
  const songId = bits[5]
  appsettings.path = ['-']
  appsettings.pathids = [null]
  appsettings.autocomplete = []

  let response = await callAPI('get', '/choir', undefined, { choirId: choirId })
  appsettings.path.push(response.choir.name)
  appsettings.pathids.push(choirId)
  appsettings.choir = response.choir
  response = await callAPI('get', '/choir/song', undefined, { choirId: choirId, songId: songId })
  appsettings.path.push(response.song.name)
  appsettings.pathids.push(songId)
  appsettings.song = response.song
  app.set('prompt', formatPath())
  res.prompt()
})

// change directory
app.cmd('cd :id', 'change directory', async function (req, res, next) {
  let response
  switch (appsettings.path.length) {
    // level 0 - user
    case 0 :
      try {
        response = await callAPI('get', '/user/byemail', undefined, { email: req.params.id })
        appsettings.path.push(req.params.id)
        appsettings.pathids.push(response.user.userId)
        appsettings.user = response.user
        app.set('prompt', formatPath())
        appsettings.autocomplete = []
        res.prompt()
      } catch (e) {
        res.red('user not found: ' + req.params.id + '\n')
        res.prompt()
      }
      break

    // level 1 - choir
    case 1:
      try {
        response = await callAPI('get', '/choir', undefined, { choirId: req.params.id })
        appsettings.path.push(response.choir.name)
        appsettings.pathids.push(req.params.id)
        appsettings.choir = response.choir
        app.set('prompt', formatPath())
        appsettings.autocomplete = []
        res.prompt()
      } catch (e) {
        res.red('choir not found: ' + req.params.id + '\n')
        res.prompt()
      }
      break

      // level 2 - song
    case 2:
      try {
        response = await callAPI('get', '/choir/song', undefined, { choirId: appsettings.choir.choirId, songId: req.params.id })
        appsettings.path.push(response.song.name)
        appsettings.pathids.push(req.params.id)
        appsettings.song = response.song
        app.set('prompt', formatPath())
        appsettings.autocomplete = []
        res.prompt()
      } catch (e) {
        res.red('choir not found: ' + req.params.id + '\n')
        res.prompt()
      }
      break
    default:
      res.prompt()
      break
  }
})

// Command registration
app.cmd('ll', 'List files', async function (req, res, next) {
  let response
  switch (appsettings.path.length) {
    // top level - we don't know email yet
    case 0:
      res.red('ll does not work at the top level. Use: cd <email>\n')
      res.prompt()
      break
    // level 1 - we know which user we're dealing with
    case 1:
      if (!appsettings.user || !appsettings.user.userId) {
        res.red('unknown user\n')
        return res.prompt()
      }
      try {
        response = await callAPI('get', '/user/choirs', undefined, { userId: appsettings.user.userId })
        appsettings.autocomplete = []
        for (const i in response.choirs) {
          const choir = response.choirs[i]
          res.cyan(choir.choirId + ' - ' + choir.name + '\n')
          appsettings.autocomplete.push(choir.choirId)
        }
        res.prompt()
      } catch (e) {
        res.red('could not list choirs for this user\n')
        res.prompt()
      }
      break
    // level 2 - we know which user/choir we are dealing with
    case 2:
      try {
        response = await callAPI('get', '/choir/songs', undefined, { choirId: appsettings.choir.choirId })
        appsettings.autocomplete = []
        for (const i in response.songs) {
          const song = response.songs[i]
          res.cyan(song.songId + ' - ' + song.name + '\n')
          appsettings.autocomplete.push(song.songId)
        }
        res.prompt()
      } catch (e) {
        res.red('could not list songs\n')
        res.prompt()
      }
      break

      // level 3 - we know which user/choir/song we are dealing with
    case 3:
      try {
        response = await callAPI('get', '/choir/songparts', undefined, { choirId: appsettings.choir.choirId, songId: appsettings.song.songId })
        appsettings.autocomplete = []
        for (const i in response.parts) {
          const part = response.parts[i]
          res.cyan(part.partId + ' ' + formatDate(part.createdOn) + ' ' + part.userName + ' ' + formatOffset(part.offset) + 'ms\n')
          appsettings.autocomplete.push(part.partId)
        }
        res.prompt()
      } catch (e) {
        res.red('could not list songs\n')
        res.prompt()
      }
      break
  }
})

// read file
app.cmd('cat :id', 'read files', async function (req, res, next) {
  let response
  switch (appsettings.path.length) {
    // top level - we don't know email yet
    case 0:
      try {
        response = await callAPI('get', '/user/byemail', undefined, { email: req.params.id })
        console.log(response.user)
        res.prompt()
      } catch (e) {
        res.red('could not cat user\n')
        res.prompt()
      }
      break
    // level 1 - we know which user we're dealing with
    case 1:
      try {
        response = await callAPI('get', '/choir', undefined, { choirId: req.params.id })
        console.log(response.choir)
        res.prompt()
      } catch (e) {
        res.red('could not cat choir\n')
        res.prompt()
      }
      break
    // level 2 - we know which user/choir we are dealing with
    case 2:
      try {
        response = await callAPI('get', '/choir/song', undefined, { choirId: appsettings.choir.choirId, songId: req.params.id })
        console.log(response.song)
        res.prompt()
      } catch (e) {
        res.red('could not cat song\n')
        res.prompt()
      }
      break

      // level 3 - we know which user/choir/song we are dealing with
    case 3:
      try {
        response = await callAPI('get', '/choir/songpart', undefined, { choirId: appsettings.choir.choirId, songId: appsettings.song.songId, partId: req.params.id })
        console.log(response.part)
        res.prompt()
      } catch (e) {
        res.red('could not cat songpart\n')
        res.prompt()
      }
      break
  }
})

// volume mod
app.cmd('volume :id :level', 'modify volume', async function (req, res, next) {
  req.params.level = parseFloat(req.params.level)
  if (req.params.level < 0 || req.params.level > 1) {
    res.red('volume must be between 0 and 1')
    res.prompt()
    return
  }

  switch (appsettings.path.length) {
    // level 3 - we know which user/choir/song we are dealing with
    case 3:

      try {
        await callAPI('post', '/choir/songpart', { choirId: appsettings.choir.choirId, songId: appsettings.song.songId, partId: req.params.id, volume: req.params.level })
        console.log('ok: volume set to', req.params.level)
        res.prompt()
      } catch (e) {
        res.red('could not set volume\n')
        res.prompt()
      }
      break
    default:
      res.red('cannot run volume in this directory\n')
      break
  }
})

// offset mod
app.cmd('offset :id :level', 'modify offset', async function (req, res, next) {
  req.params.level = parseFloat(req.params.level)
  if (req.params.level < 0 || req.params.level > 10000) {
    res.red('volume must be between 0 and 10000')
    res.prompt()
    return
  }

  switch (appsettings.path.length) {
    // level 3 - we know which user/choir/song we are dealing with
    case 3:
      try {
        await callAPI('post', '/choir/songpart', { choirId: appsettings.choir.choirId, songId: appsettings.song.songId, partId: req.params.id, offset: req.params.level })
        console.log('ok: offset set to', req.params.level)
        res.prompt()
      } catch (e) {
        res.red('could not set offset\n')
        res.prompt()
      }
      break
    default:
      res.red('cannot run offset in this directory\n')
      break
  }
})

// hide
app.cmd('hide :id', 'hide song parts', async function (req, res, next) {
  switch (appsettings.path.length) {
    // level 3 - we know which user/choir/song we are dealing with
    case 3:
      try {
        await callAPI('post', '/choir/songpart', { choirId: appsettings.choir.choirId, songId: appsettings.song.songId, partId: req.params.id, hidden: true })
        console.log('ok: hidden part')
        res.prompt()
      } catch (e) {
        res.red('could not hide part\n')
        res.prompt()
      }
      break
    default:
      res.red('cannot run hide in this directory\n')
      break
  }
})

// audio
app.cmd('audio :id :flag', 'audio only song parts', async function (req, res, next) {
  const flag = req.params.flag === 'true'
  switch (appsettings.path.length) {
    // level 3 - we know which user/choir/song we are dealing with
    case 3:
      try {
        await callAPI('post', '/choir/songpart', { choirId: appsettings.choir.choirId, songId: appsettings.song.songId, partId: req.params.id, audio: flag })
        console.log('ok: audio part')
        res.prompt()
      } catch (e) {
        res.red('could not audio part\n')
        res.prompt()
      }
      break
    default:
      res.red('cannot run audio in this directory\n')
      break
  }
})

// unhide
app.cmd('unhide :id', 'unhide song parts', async function (req, res, next) {
  switch (appsettings.path.length) {
    // level 3 - we know which user/choir/song we are dealing with
    case 3:
      try {
        await callAPI('post', '/choir/songpart', { choirId: appsettings.choir.choirId, songId: appsettings.song.songId, partId: req.params.id, hidden: false })
        console.log('ok: unhidden part')
        res.prompt()
      } catch (e) {
        res.red('could not unhide part\n')
        res.prompt()
      }
      break
    default:
      res.red('cannot run unhide in this directory\n')
      break
  }
})

// open
app.cmd('open', 'open in the web interface', function (req, res, next) {
  let u
  switch (appsettings.path.length) {
    // level 2 - we know which user/choir we are dealing with
    case 2:
      u = `https://www.choirless.com/dashboard/choir/${appsettings.choir.choirId}`
      console.log('ok: choir opened in browser')
      exec(`open ${u}`)
      res.prompt()
      break
    // level 3 - we know which user/choir/song we are dealing with
    case 3:
      u = `https://www.choirless.com/dashboard/choir/${appsettings.choir.choirId}/song/${appsettings.song.songId}`
      exec(`open ${u}`)
      console.log('ok: song opened in browser')
      res.prompt()
      break
    default:
      u = 'https://www.choirless.com'
      exec(`open ${u}`)
      console.log('ok: opened choirless')
      res.prompt()
      break
  }
})

// download all
app.cmd('download all', 'download all song parts', async function (req, res, next) {
  let response
  switch (appsettings.path.length) {
    case 3:
      try {
        response = await callAPI('get', '/choir/songparts', undefined, { choirId: appsettings.choir.choirId, songId: appsettings.song.songId })
        console.log(`downloading ${response.parts.length} song parts`)
        for (const i in response.parts) {
          const part = response.parts[i]
          const partId = part.partId
          const downloadURL = await callAPI('post', '/choir/songpart/download', { choirId: appsettings.choir.choirId, songId: appsettings.song.songId, partId: partId }, {})
          const filename = [partId, part.userName.replace(/ /g, '_')].join('_') + '.webm'
          const counter = parseInt(i) + 1
          progress(partId, counter, response.parts.length)
          await downloadFile(downloadURL.url, filename)
        }
        progress('complete', response.parts.length, response.parts.length, true)
        console.log('\n')
        res.prompt()
      } catch (e) {
        res.red('could not list songs\n')
        res.prompt()
      }
      break
    default:
      res.red('cannot download from here\n')
      res.prompt()
      break
  }
})

// download a single song part
app.cmd('download :id', 'download a song part', async function (req, res, next) {
  switch (appsettings.path.length) {
    case 3:
      try {
        console.log('downloading song part')
        const partId = req.params.id
        const downloadURL = await callAPI('post', '/choir/songpart/download', { choirId: appsettings.choir.choirId, songId: appsettings.song.songId, partId: partId }, {})
        const filename = partId + '.webm'
        await downloadFile(downloadURL.url, filename)
        console.log('download complete')
        res.prompt()
      } catch (e) {
        res.red('could not download song part\n')
        res.prompt()
      }
      break
    default:
      res.red('cannot download from here\n')
      res.prompt()
      break
  }
})

// Event notification
app.on('quit', function () {
  process.exit()
})
