//const cheerio = require('cheerio');
const cheerio = createCheerio()
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
    const $img = $item.find('.v-item-cover img.lazy').eq(1)
    const $remark = $item.find('.v-item-bottom span')
    const $score = $item.find('.v-item-top-left span')
    
    if ($link.length) {
      const href = $link.attr('href') || ''
      const vod_id = href.split('/').filter(Boolean).pop() || ''
      
      cards.push({
        vod_id,
        vod_name: $item.find('.v-item-title').eq(1).text().trim(),
        vod_pic: "https://vres.wbadl.cn" + $img.attr('data-original') || '',
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
    const { data } = await $fetch.get(ext.url, {
      headers
    })
    const $ = cheerio.load(data)
    const groups = []

    // 找到播放线路列表
    $('.source-swiper-slide').each((i, el) => {
      const $el = $(el)
      const title = $el.find('.source-item-label').text().trim()
      const episodeCount = parseInt($el.find('.source-item-num').text())
      
      // 找到对应的集数列表
      const episodeList = $('.episode-list').eq(i)
      const tracks = []
      
      episodeList.find('.episode-item').each((j, epEl) => {
        const $epEl = $(epEl)
        tracks.push({
          name: $epEl.text().trim(),
          ext: {
            url: $epEl.attr('href')
          }
        })
      })

      if (tracks.length > 0) {
        groups.push({
          title,
          tracks
        })
      }
    })
      $print(`[kikjs] 开始获取播放tracks: ${JSON.stringify(groups, null, 2)}`);

    $print(`[kikjs] 获取到 ${groups.length} 个播放列表组`)
    return jsonify({
      list: groups
    })
  } catch (error) {
    console.error('获取播放线路失败:', error)
    return jsonify({
      list: []
    })
  }
}

//async function getPlayinfo(ext) {
//  try {
//    const { url } = argsify(ext)
//    const newurl = appConfig.site + url
//    $print(`[kikjs] 开始获取播放地址: ${newurl}`)
//    
//    const { data } = await $fetch.get(newurl, {
//      headers
//    })
//    
//    // 从页面中提取加密的播放地址
//    const playSourceMatch = data.match(/playSource\s*=\s*({[^}]+})/);
//    if (!playSourceMatch) {
//      $print(`[kikjs] 未找到播放地址`)
//      return jsonify({
//        urls: []
//      })
//    }
//
//    // 处理Unicode转义
//    const playSourceStr = playSourceMatch[1]
//      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
//      .replace(/'/g, '"'); // 将单引号替换为双引号
//
//    const playSource = JSON.parse(playSourceStr);
//    const playUrl = playSource.src;
//    
//    $print(`[kikjs] 获取到播放地址: ${playUrl}`)
//    return jsonify({
//      urls: [playUrl]
//    })
//    
//  } catch (err) {
//    $print(`[kikjs] 解析播放地址失败: ${err}`)
//    return jsonify({
//      urls: []
//    })
//  }
//}

async function getPlayinfo(ext) {
  try {
    const { url } = argsify(ext)
    const newurl = appConfig.site + url
    $print(`[kikjs] 开始获取播放地址: ${newurl}`)
    
    const { data } = await $fetch.get(newurl, {
      headers
    })
    
    // 从页面中提取KKYS配置
    const kkysMatch = data.match(/KKYS\s*=\s*({[^;]+});/);
    if (!kkysMatch) {
      $print(`[kikjs] 未找到KKYS配置，使用默认配置`)
      // 使用默认配置
      const KKYS = {
        KEYS: [{
          key: "ayt5wy5afwmwrpb19k9s0n",
          iv: "b3t069ijy7",
          version: 1
        }],
        HASH: "te@9fs#5tbx",
        appId: "tTMDApiDomain",
        os: "pc",
        userChannel: "c10000"
      };
    } else {
      // 处理KKYS配置
      const kkysConfig = kkysMatch[1]
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/'/g, '"')
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      $print(`[kikjs] KKYS配置: ${kkysConfig}`);
      
      // 解析KKYS配置
      const KKYS = JSON.parse(kkysConfig);
    }

    // 从页面中提取加密的播放地址
    const configMatch = data.match(/config\s*=\s*({[^}]+})/);
    if (!configMatch) {
      $print(`[kikjs] 未找到播放配置`)
      return jsonify({
        urls: []
      })
    }

    // 处理Unicode转义和特殊语法
    const configStr = configMatch[1]
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/'/g, '"') // 将单引号替换为双引号
      .replace(/!!\[\]/g, 'true') // 将!![]替换为true
      .replace(/\[\]/g, '[]'); // 将[]替换为[]

    $print(`[kikjs] 处理后的配置: ${configStr}`)

    // 提取加密的播放地址
    const urlMatch = configStr.match(/KKYS\["safePlay"\]\(\)\["url"\]\("([^"]+)"\)/);
    if (!urlMatch) {
      $print(`[kikjs] 未找到加密的播放地址`)
      return jsonify({
        urls: []
      })
    }

    const encryptedUrl = urlMatch[1];
    $print(`[kikjs] 加密的播放地址: ${encryptedUrl}`)

    // 移除特殊字符串
    let cleanUrl = encryptedUrl.replace(/Isu7fOAvI6!&IKpAbVdhf&\^F/g, '');
    
    // 如果cleanUrl为空，说明整个字符串就是特殊字符串，不需要解密
    if (!cleanUrl) {
      $print(`[kikjs] 播放地址是特殊字符串，不需要解密`)
      return jsonify({
        urls: [encryptedUrl]
      })
    }
    
    // 使用AES解密
    const decryptedBytes = CryptoJS.AES.decrypt(
      cleanUrl,
      CryptoJS.enc.Utf8.parse(KKYS.KEYS[0].key),
      {
        iv: CryptoJS.enc.Utf8.parse(KKYS.KEYS[0].iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const decryptedUrl = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    $print(`[kikjs] 解密后的播放地址: ${decryptedUrl}`)
    return jsonify({
      urls: [decryptedUrl]
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
      //"https://vres.wbadl.cn" + $img.attr('data-original') || '',
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
        vod_pic: "https://vres.wbadl.cn" + $img.attr('data-original') || '',
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
