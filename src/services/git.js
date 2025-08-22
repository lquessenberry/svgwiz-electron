/*
  Git service: thin wrapper around simple-git with graceful fallback
  if dependency is missing. All functions return { success, ... }.
*/

const path = require('path')
let simpleGit
try { simpleGit = require('simple-git') } catch (_) { simpleGit = null }

function notInstalled () {
  return { success: false, error: 'simple-git not installed. Run: npm i simple-git' }
}

function getGit (dir) {
  if (!simpleGit) return null
  return simpleGit({ baseDir: dir })
}

// Ensure returned values are plain JSON-serializable objects
function toPlain (obj) {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch (_) {
    return obj
  }
}

async function initRepo (dir) {
  try {
    const git = getGit(dir)
    if (!git) return notInstalled()
    const isRepo = await git.checkIsRepo()
    if (!isRepo) await git.init()
    return { success: true, initialized: !isRepo }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function status (dir) {
  try {
    const git = getGit(dir)
    if (!git) return notInstalled()
    const st = await git.status()
    return { success: true, status: toPlain(st) }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function addAllCommit (dir, message = 'chore(svgwiz): update assets') {
  try {
    const git = getGit(dir)
    if (!git) return notInstalled()
    await git.add('.')
    const res = await git.commit(message)
    return { success: true, commit: toPlain(res) }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function createBranch (dir, name) {
  try {
    const git = getGit(dir)
    if (!git) return notInstalled()
    await git.checkoutLocalBranch(name)
    return { success: true, branch: name }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function merge (dir, sourceBranch) {
  try {
    const git = getGit(dir)
    if (!git) return notInstalled()
    const res = await git.merge([sourceBranch])
    return { success: true, result: toPlain(res) }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function log (dir, limit = 50) {
  try {
    const git = getGit(dir)
    if (!git) return notInstalled()
    const res = await git.log({ maxCount: Number(limit) || 50 })
    return { success: true, log: toPlain(res) }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

module.exports = {
  initRepo,
  status,
  addAllCommit,
  createBranch,
  merge,
  log
}
