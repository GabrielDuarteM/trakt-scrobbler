import Log from "../utils/logger"
import TraktApi from "../utils/api"
import { sleep } from "../utils/helper"

export default class Crunchyroll {
  constructor() {
    this.Player = document.querySelector("#video_html5_api")
    this.Show = null
    this.Episode = null
    this.Api = new TraktApi()
    this.IsScrobblePlaying = false
    this.Watched = false

    this.SetPlayerEvents()
  }

  async SetPlayerEvents() {
    if (this.CheckValidPage()) {
      this.Player.onplay = await this.StartPauseScrobble.bind(this, true)
      this.Player.onpause = await this.StartPauseScrobble.bind(this, false)
      window.onunload = await ::this.StopScrobble
    }
  }

  CheckValidPage() {
    return !!this.Player
  }

  GetEpisodeInfo() {
    const rgx = /\/(.*?)\/episode-(\d+)-/
    const matches = rgx.exec(location.pathname)
    return {
      queryTitle: matches[1],
      absoluteEpisode: matches[2]
    }
  }

  async StartPauseScrobble(isStart = !this.IsScrobblePlaying) {
    if (!await this.CheckIfReadyToScrobble()) {
      return
    }

    const progressPercentage = Math.floor(this.Player.currentTime / this.Player.duration * 100)

    if (progressPercentage < 90) {
      this.Api.StartPauseScrobble(this.Episode, progressPercentage, isStart).then(data => {
        this.IsScrobblePlaying = isStart
      })
    } else {
      this.Api.WatchEpisode(this.Episode).then(data => {
        console.log("episodio watchado")
        this.Watched = true
      })
    }
  }

  StopScrobble() {
    const progressPercentage = Math.floor(this.Player.currentTime / this.Player.duration * 100)
    this.Api.StopScrobble(this.Episode, progressPercentage).then(data => {
      console.log("Scrobble stoppado")
    })
  }

  async FillEpisodeIfNecessary() {
    if (!this.Episode) {
      const episodeInfo = this.GetEpisodeInfo()
      this.Show = await this.Api.GetShow(episodeInfo.queryTitle)
      this.Episode = await this.Api.GetEpisode({
        showSlug: this.Show.ids.slug,
        absoluteNum: episodeInfo.absoluteEpisode
      })
    }
  }

  async CheckIfReadyToScrobble() {
    if (this.Api.NoToken || this.Watched) {
      return false
    }

    await this.FillEpisodeIfNecessary()

    while (this.Player.currentTime === 0) {
      await sleep(100)
    }

    return true
  }
}
