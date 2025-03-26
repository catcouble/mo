const cheerio = require('cheerio');
//const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
const headers = {
  'User-Agent': UA,
}

const appConfig = {
  ver: 1,
  title: "网飞猫",
  site: "https://www.ncat23.com",
  tabs: [{
    name: '电影',
    ext: {
      url: '/show/1------.html'
    },
  }, {
    name: '电视剧',
    ext: {
      url: '/show/2------.html'
    },
  }, {
    name: '动漫',
    ext: {
      url: '/show/3------.html'
    },
  }, {
    name: '综艺',
    ext: {
      url: '/show/4------.html'
    },
  }]
}

async function getConfig() {
  return jsonify(appConfig)
}

async function getCards(ext) {
  ext = argsify(ext)
  let cards = []
  let url = ext.url
  let page = ext.page || 1
  
  $print(`[kikjs] 开始获取列表: ${url}, 页码: ${page}`)
  
  // 构造完整URL，使用新的分页格式
  const fullUrl = appConfig.site + url.replace('.html', `-${page}.html`)
  
  $print(`[kikjs] 请求URL: ${fullUrl}`)

  const { data } = await $fetch.get(fullUrl, {
    headers
  })
  
  const $ = cheerio.load(data)
  
  $('.module-item').each((_, item) => {
    const $item = $(item)
    const $link = $item.find('.v-item')
    const $img = $item.find('.v-item-cover img.lazy')
    const $remark = $item.find('.v-item-bottom span')
    const $score = $item.find('.v-item-top-left span')
    
    if ($link.length) {
      const href = $link.attr('href') || ''
      const vod_id = href.split('/').filter(Boolean).pop() || ''
      
      cards.push({
        vod_id,
        vod_name: $item.find('.v-item-title').eq(1).text().trim(),
        vod_pic: $img.data('original') || '',
        vod_remarks: $remark.text().trim(),
        vod_score: $score.text().trim(),
        ext: {
          url: appConfig.site + href
        }
      })
    }
  })

  $print(`[kikjs] 成功获取 ${cards.length} 个视频条目`)
  return { list: cards }
}

async function getTracks(ext) {
  try {
//    const response = await fetch(ext.url, {
//        headers: headers
//    });
//    const $ = cheerio.load(await response.text());
     
    const { data } = await $fetch.get(ext.url, {
        headers
    })
    const $ = cheerio.load(data)
      
    const groups = [];

    // 找到播放线路列表
    const sourceItems = $('.source-swiper-slide .source-item');
    sourceItems.each((i, el) => {
      const $el = $(el);
      const title = $el.find('.source-item-label').text().trim();
      const episodeCount = parseInt($el.find('.source-item-num').text());
      
      // 找到对应的集数列表
      const episodeList = $('.episode-list');
      const tracks = [];
      
      episodeList.find('.episode-item').each((j, epEl) => {
        const $epEl = $(epEl);
          tracks.push({
          name: $epEl.text().trim(),
//          url: $epEl.attr('href')
              ext: {
                             url: $epEl.attr('href')
                          }
        });
      });

      if (tracks.length > 0) {
          groups.push({
          title,
          tracks
        });
      }
    });
//      $print(`[kikjs] 开始获取播放tracks: ${JSON.stringify(tracks, null, 2)}`);
//      $print(`[kikjs] getTracks tracks，数量: ${tracks.length}`);
//    return tracks;
      $print(`[kikjs] 获取到 ${groups.length} 个播放列表组`)
       return jsonify({
         list: groups
       })
  } catch (error) {
    console.error('获取播放线路失败:', error);
    return [];
  }
}

async function getPlayinfo(ext) {
  try {
    const { url } = argsify(ext)
    const newurl = appConfig.site + url
    $print(`[kikjs] 开始获取播放地址: ${newurl}`)
    
    const { data } = await $fetch.get(newurl, {
      headers
    })
    
    // 从页面中提取加密的播放地址
    const playSourceMatch = data.match(/playSource\s*=\s*({[^}]+})/);
    if (!playSourceMatch) {
      $print(`[kikjs] 未找到播放地址`)
      return jsonify({
        urls: []
      })
    }

    // 处理Unicode转义
    const playSourceStr = playSourceMatch[1]
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/'/g, '"'); // 将单引号替换为双引号

    const playSource = JSON.parse(playSourceStr);
    const playUrl = playSource.src;
    
    $print(`[kikjs] 获取到播放地址: ${playUrl}`)
    return jsonify({
      urls: [playUrl]
    })
    
  } catch (err) {
    $print(`[kikjs] 解析播放地址失败: ${err}`)
    return jsonify({
      urls: []
    })
  }
}

async function search(ext) {
  try {
    const { text } = argsify(ext)
    if (!text) {
      return jsonify({
        list: []
      })
    }

    $print(`[kikjs] 开始搜索: ${text}`)
    const url = appConfig.site + `/search?os=pc&k=${encodeURIComponent(text)}`
    const { data } = await $fetch.get(url, {
      headers
    })

    const $ = cheerio.load(data)
    const list = []

    // 解析搜索结果列表
    $('.search-result-item').each((_, item) => {
      const $item = $(item)
      const href = $item.attr('href') || ''
      const vod_id = href.split('/').filter(Boolean).pop() || ''
      
      const $img = $item.find('.search-result-item-pic img.lazy')
      const $title = $item.find('.title')
      const $tags = $item.find('.tags span')
      const $actors = $item.find('.actors span')
      const $desc = $item.find('.desc')
      
      // 提取年份、地区、类型等信息
      const tags = []
      $tags.each((_, tag) => {
        tags.push($(tag).text().trim())
      })
      
      list.push({
        vod_id,
        vod_name: $title.text().trim(),
        vod_pic: $img.attr('data-original') || '',
        vod_remarks: tags.join('/'),
        vod_score: $actors.text().trim(),
        vod_content: $desc.text().trim(),
        ext: {
          url: appConfig.site + href
        }
      })
    })

    $print(`[kikjs] 搜索到 ${list.length} 个结果`)
    return jsonify({
      list
    })
  } catch (err) {
    $print(`[kikjs] 搜索失败: ${err}`)
    return jsonify({
      list: []
    })
  }
}
