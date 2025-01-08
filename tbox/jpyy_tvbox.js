var rule = {
    title:'金牌影院',
    host:'https://www.cfkj86.com',
    url:'/api/mw-movie/anonymous/video/list?pageNum=fypage&pageSize=30&sort=1&sortBy=1&type1=fyclass',
    searchUrl:'/api/mw-movie/anonymous/video/searchByWordPageable?keyword=**&pageNum=fypage&pageSize=12&type=false',
    searchable:2,
    quickSearch:0,
    filterable:0,
    headers:{
        'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    },
    timeout:5000,
    class_name:'电影&电视剧&综艺&动漫',
    class_url:'1&2&3&4',
    play_parse:true,
    lazy:'',
    limit:6,
    推荐:'',
    一级:'json:data.list;vodName;vodPic;vodRemarks;vodId',
    二级:'*',
    搜索:'*'
};

async function init(cfg) {
    rule = Object.assign(rule, cfg);
    return JSON.stringify({
        class: rule.class_name.split('&').map((name, index) => ({
            type_name: name,
            type_id: rule.class_url.split('&')[index]
        }))
    });
}

async function home(filter) {
    return JSON.stringify({
        class: rule.class_name.split('&').map((name, index) => ({
            type_name: name,
            type_id: rule.class_url.split('&')[index]
        }))
    });
}

async function category(tid, pg, filter, extend) {
    const path = rule.url.replace('fyclass', tid).replace('fypage', pg);
    const url = rule.host + path;
    const headers = getHeader(url);
    const response = await fetch(url, { headers });
    const json = await response.json();
    const data = json.data;
    
    let videos = [];
    for (const item of data.list) {
        if (item.vodName.includes('预告')) continue;
        videos.push({
            vod_id: item.vodId.toString(),
            vod_name: item.vodName,
            vod_pic: item.vodPic,
            vod_remarks: item.vodRemarks || item.vodVersion || '',
        });
    }
    return JSON.stringify({
        page: parseInt(pg),
        pagecount: Math.ceil(data.total / 30),
        limit: 30,
        total: data.total,
        list: videos,
    });
}

async function detail(id) {
    const path = '/api/mw-movie/anonymous/video/detail?id=' + id;
    const url = rule.host + path;
    const headers = getHeader(url);
    const response = await fetch(url, { headers });
    const json = await response.json();
    const data = json.data;
    
    let vod = {
        vod_id: data.vodId,
        vod_name: data.vodName,
        vod_pic: data.vodPic,
        type_name: data.typeName,
        vod_year: data.vodYear,
        vod_area: data.vodArea,
        vod_remarks: data.vodRemarks,
        vod_actor: data.vodActor,
        vod_director: data.vodDirector,
        vod_content: data.vodContent,
        vod_play_from: "播放源",
        vod_play_url: data.episodeList.map(item => item.name + "$" + data.vodId + "_" + item.nid).join("#"),
    }
    
    return JSON.stringify({
        list: [vod]
    });
}

async function play(flag, id, flags) {
    const [vodId, nid] = id.split('_')
    const path = `/api/mw-movie/anonymous/v1/video/episode/url?id=${vodId}&nid=${nid}`;
    const url = rule.host + path;
    const headers = getHeader(url);
    const response = await fetch(url, { headers });
    const json = await response.json();
    
    return JSON.stringify({
        parse: 0,
        url: json.data.playUrl,
        header: {
            'User-Agent': headers['User-Agent'],
            Referer: url,
        }
    });
}

async function search(wd, quick) {
    const page = 1
    const path = `/api/mw-movie/anonymous/video/searchByWordPageable?keyword=${encodeURIComponent(wd)}&pageNum=${page}&pageSize=12&type=false`
    const url = rule.host + path
    const signStr = `searchByWordPageable?keyword=${wd}&pageNum=${page}&pageSize=12&type=false`
    const headers = getHeader(signStr)

    const response = await fetch(url, { headers });
    const json = await response.json();
    const data = json.data;

    let videos = []
    for (const item of data.list) {
        if (item.vodName.includes('预告')) continue
        videos.push({
            vod_id: item.vodId.toString(),
            vod_name: item.vodName,
            vod_pic: item.vodPic,
            vod_remarks: item.vodRemarks || item.vodVersion || '',
        })
    }
    return JSON.stringify({
        list: videos
    })
}

function getHeader(url) {
    const signKey = 'cb808529bae6b6be45ecfab29a4889bc'
    const dataStr = url.split('?')[1]
    const t = Date.now()
    const signStr = dataStr + `&key=${signKey}` + `&t=${t}`

    function getUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (e) => ('x' === e ? (16 * Math.random()) | 0 : 'r&0x3' | '0x8').toString(16))
    }

    return {
        'User-Agent': rule.headers['User-Agent'],
        deviceId: getUUID(),
        t: t.toString(),
        sign: md5(signStr),
    }
}

function md5(str) {
    return CryptoJS.MD5(str).toString()
}
