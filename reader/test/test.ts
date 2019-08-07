import * as test from 'tape'
import * as fs from 'fs'
import * as path from 'path'

import { GaiaDiskReader } from '../src/server'

function testServer() {
  test('check handleGet', (t) => {
    t.plan(8)
    
    const storageDir = `/tmp/gaia-disk-${Math.random()}`

    // store /12345/foo/bar.txt
    fs.mkdirSync(storageDir)
    fs.mkdirSync(path.join(storageDir, '/12345'))
    fs.mkdirSync(path.join(storageDir, '/12345/foo'))
    fs.writeFileSync(path.join(storageDir, '/12345/foo/bar.txt'), 'hello world')

    // store /.gaia-metadata/12345/foo/bar.txt
    fs.mkdirSync(path.join(storageDir, '.gaia-metadata'))
    fs.mkdirSync(path.join(storageDir, '.gaia-metadata/12345'))
    fs.mkdirSync(path.join(storageDir, '.gaia-metadata/12345/foo'))
    fs.writeFileSync(path.join(storageDir, '.gaia-metadata/12345/foo/bar.txt'), 
      JSON.stringify({'content-type': 'application/potatoes'}))    // bogus mime type for testing
    
    const config = {
      diskSettings: {
        storageRootDirectory: storageDir
      }
    }

    const server = new GaiaDiskReader(config)
    server.handleGet('12345', 'foo/bar.txt')
      .then((result) => {
        t.ok(result.exists, 'file exists')
        t.equal(result.contentType, 'application/potatoes', 'file has correct content type')

        // try with missing content-type
        fs.unlinkSync(path.join(storageDir, '.gaia-metadata/12345/foo/bar.txt'))
        return server.handleGet('12345', 'foo/bar.txt')
      })
      .then((result) => {
        t.ok(result.exists, 'file exists')
        t.equal(result.contentType, 'application/octet-stream', 'file has fall-back content type')

        // try without the gaia metadata directory
        fs.rmdirSync(path.join(storageDir, '.gaia-metadata/12345/foo'))
        fs.rmdirSync(path.join(storageDir, '.gaia-metadata/12345'))
        fs.rmdirSync(path.join(storageDir, '.gaia-metadata'))
        return server.handleGet('12345', 'foo/bar.txt')
      })
      .then((result) => {
        t.ok(result.exists, 'file exists')
        t.equal(result.contentType, 'application/octet-stream', 'file has fall-back content type')

        // blow away the file 
        fs.unlinkSync(path.join(storageDir, '12345/foo/bar.txt'))
        fs.rmdirSync(path.join(storageDir, '12345/foo'))
        fs.rmdirSync(path.join(storageDir, '12345'))

        return server.handleGet('12345', 'foo/bar.txt')
      })
      .then((result) => {
        t.ok(!result.exists, 'file does not exist')
        t.equal(result.contentType, undefined, 'file has no content type')

        fs.rmdirSync(storageDir)
      })
  })
}

testServer()
