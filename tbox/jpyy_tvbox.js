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

function getHeader(url) {
    const signKey = 'cb808529bae6b6be45ecfab29a4889bc'
    const dataStr = url.split('?')[1]
    const t = Date.now()
    const signStr = dataStr + `&key=${signKey}` + `&t=${t}`

    function getUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(e) {
            return ('x' === e ? (16 * Math.random()) | 0 : 'r&0x3' | '0x8').toString(16)
        })
    }

    return {
        'User-Agent': rule.headers['User-Agent'],
        deviceId: getUUID(),
        t: t.toString(),
        sign: CryptoJS.SHA1(CryptoJS.MD5(signStr).toString()).toString()
    }
}

function init(cfg) {
    if (cfg.headers) {
        rule.headers = cfg.headers;
    }
    return JSON.stringify({
        class: rule.class_name.split('&').map(function(name, index) {
            return {
                type_name: name,
                type_id: rule.class_url.split('&')[index]
            }
        })
    });
}

function home(filter) {
    return JSON.stringify({
        class: rule.class_name.split('&').map(function(name, index) {
            return {
                type_name: name,
                type_id: rule.class_url.split('&')[index]
            }
        })
    });
}

function category(tid, pg, filter, extend) {
    var path = rule.url.replace('fyclass', tid).replace('fypage', pg);
    var url = rule.host + path;
    var headers = getHeader(url);
    
    var response = fetch(url, {
        headers: headers,
        timeout: 5000
    });
    var data = JSON.parse(response.content || '{}');
    if (!data.data || !data.data.list) {
        return JSON.stringify({
            list: []
        });
    }
    
    var videos = [];
    data.data.list.forEach(function(item) {
        if (item.vodName.includes('预告')) return;
        videos.push({
            vod_id: item.vodId.toString(),
            vod_name: item.vodName,
            vod_pic: item.vodPic,
            vod_remarks: item.vodRemarks || item.vodVersion || ''
        });
    });
    
    return JSON.stringify({
        page: parseInt(pg),
        pagecount: Math.ceil(data.data.total / 30),
        limit: 30,
        total: data.data.total,
        list: videos
    });
}

function detail(id) {
    var path = '/api/mw-movie/anonymous/video/detail?id=' + id;
    var url = rule.host + path;
    var headers = getHeader(url);
    
    var response = fetch(url, {
        headers: headers,
        timeout: 5000
    });
    var data = JSON.parse(response.content || '{}');
    if (!data.data) {
        return JSON.stringify({
            list: []
        });
    }
    
    var vod = {
        vod_id: data.data.vodId,
        vod_name: data.data.vodName,
        vod_pic: data.data.vodPic,
        type_name: data.data.typeName,
        vod_year: data.data.vodYear,
        vod_area: data.data.vodArea,
        vod_remarks: data.data.vodRemarks,
        vod_actor: data.data.vodActor,
        vod_director: data.data.vodDirector,
        vod_content: data.data.vodContent,
        vod_play_from: "播放源",
        vod_play_url: data.data.episodeList.map(function(item) {
            return item.name + "$" + data.data.vodId + "_" + item.nid
        }).join("#")
    };
    
    return JSON.stringify({
        list: [vod]
    });
}

function play(flag, id, flags) {
    var ids = id.split('_');
    var vodId = ids[0], nid = ids[1];
    var path = '/api/mw-movie/anonymous/v1/video/episode/url?id=' + vodId + '&nid=' + nid;
    var url = rule.host + path;
    var headers = getHeader(url);
    
    var response = fetch(url, {
        headers: headers,
        timeout: 5000
    });
    var data = JSON.parse(response.content || '{}');
    if (!data.data) {
        return JSON.stringify({
            parse: 0,
            url: ''
        });
    }
    
    return JSON.stringify({
        parse: 0,
        url: data.data.playUrl,
        header: {
            'User-Agent': headers['User-Agent'],
            'Referer': url
        }
    });
}

function search(wd, quick) {
    var page = 1;
    var path = '/api/mw-movie/anonymous/video/searchByWordPageable?keyword=' + encodeURIComponent(wd) + '&pageNum=' + page + '&pageSize=12&type=false';
    var url = rule.host + path;
    var signStr = 'searchByWordPageable?keyword=' + wd + '&pageNum=' + page + '&pageSize=12&type=false';
    var headers = getHeader(signStr);
    
    var response = fetch(url, {
        headers: headers,
        timeout: 5000
    });
    var data = JSON.parse(response.content || '{}');
    if (!data.data || !data.data.list) {
        return JSON.stringify({
            list: []
        });
    }
    
    var videos = [];
    data.data.list.forEach(function(item) {
        if (item.vodName.includes('预告')) return;
        videos.push({
            vod_id: item.vodId.toString(),
            vod_name: item.vodName,
            vod_pic: item.vodPic,
            vod_remarks: item.vodRemarks || item.vodVersion || ''
        });
    });
    
    return JSON.stringify({
        list: videos
    });
}
