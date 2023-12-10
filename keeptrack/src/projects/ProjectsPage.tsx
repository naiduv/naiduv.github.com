import React from 'react';
import { useState } from 'react';
import { MOCK_PROJECTS } from './MockProjects';
import Project from './Project';


const testProjects = [
    new Project({id: 1, description: 'test0description', name: 'test0name', url: 'test0url'}),
    new Project({id: 2, description: 'test1description', name: 'test1name', url: 'test1url'}),
    new Project({id: 3, description: 'test2description', name: 'test2name', url: 'test2url'}),
    new Project({id: 4, description: 'test3description', name: 'test3name', url: 'test3url'})
]

function ProjectsPage(){
    const [projects, setProjects] = useState(testProjects)
    const [newProject, setNewProject] = useState({id: 0, description: "desc", name: "name", imageUrl: "url"})
    const [mainImage, setMainImage] = useState("https://cdn2.thecatapi.com/images/MTk4MTAxOQ.jpg")
    function handleDeleteClick(id: number|undefined){
        if(id===undefined)
            return;
        setProjects(projects.filter(p => p.id!==id))
    }

    function handleAddClick(){
        var np = new Project(newProject);
        var newProjectList: Project[] = [np, ...projects];
        setProjects(newProjectList)        
    }

    async function getRandomImage(){
        var result = await fetch("https://api.thecatapi.com/v1/images/search");
        var response = await result.json()
        setMainImage(response[0].url);
    }

    const renderProjects = projects.map((p: Project) => {
        return(
            <tr>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.description}</td>
                <td>{p.imageUrl}</td>
                <td>
                    <button onClick={() => handleDeleteClick(p.id)}>delete</button>
                    <button onClick={() => setMainImage(p.imageUrl)}>setImage</button>
                
                </td>
            </tr>
        )
    });

    const inputStyle = {
        'width': '200px'
    }

    const mainImageStyle = {
        'height': '400px'
    }

    return (
        <>
            <table>
                <tr>
                    <th>id</th>
                    <th>name</th>
                    <th>description</th>
                    <th>url</th>
                    <th>action</th>
                </tr>        
                <tr>
                    <td><input style={inputStyle} value={newProject.id} onChange={(e) => setNewProject({...newProject, id: parseInt(e.target.value) || 0})}/></td>
                    <td><input style={inputStyle} value={newProject.name}  onChange={(e) => setNewProject({...newProject, name: e.target.value})}/></td>
                    <td><input style={inputStyle} value={newProject.description}  onChange={(e) => setNewProject({...newProject, description: e.target.value})}/></td>
                    <td><input style={inputStyle} value={newProject.imageUrl} onChange={(e) => setNewProject({...newProject, imageUrl: e.target.value})}/></td>
                    <td><button onClick={handleAddClick}>add</button></td>            
                </tr>        
                {renderProjects}
            </table>
            <button onClick={() => getRandomImage()}>random cat image</button><br/>
            <img style={mainImageStyle} src={mainImage}></img>
            <div>retrieved from https://thecatapi.com/</div>
        </>
    );


}

export default ProjectsPage;