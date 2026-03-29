import { prepareInstructions } from 'constants/index';
import {useState, type FormEvent,} from 'react'
import { useNavigate } from 'react-router';


import FileUploader from '~/components/FileUploader';
import Navbar from '~/components/Navbar'
import { convertPdfToImage } from '~/lib/pdf2img';
import { usePuterStore } from '~/lib/puter';
import { generateUUID } from '~/lib/utils';

const upload = () => {
    const{ auth,isLoading,fs,ai,kv}=usePuterStore();
    const navigate=useNavigate();
    const [isProcessing,setIsProcessing]=useState(false);
    const[statusText,setStatusText]=useState("");
    const handleFileSelect=(file:File|null)=>{
            setFile(file)
    }
    const handleAnalyze= async ({companyName,jobTitle,jobDescription,file}:{companyName: string,jobTitle: string,jobDescription: string,file:File})=>{
          setIsProcessing(true);
                    setStatusText('Uploading the file...');
                    const uploadedFile= await fs.upload([file]);
                    if(!uploadedFile) return setStatusText('Error: Failed Uploading File');

                    setStatusText('Converting to image...');
                    const imageFile = await convertPdfToImage(file);
            console.log('pdf2img result:', imageFile);

                    if(!imageFile.file)return setStatusText('Error: Failed to convert pdf2img');
                    setStatusText('Uploading the image...');
                    const uploadedImage= await fs.upload([imageFile.file]);
                    if(!uploadedImage)return setStatusText('Error: Failed upload image');
                    setStatusText('Preparing data...');
                    const uuid =generateUUID();
                    const data={
                        id:uuid,
                        resumePath:uploadedFile.path,
                        imagePath:uploadedImage.path,
                        companyName,jobDescription,jobTitle,
                        feedback:'',
                    }
                    await kv.set(`resume:${uuid}`,JSON.stringify(data));
                    setStatusText('Analyzing...')
                    const feedback=await ai.feedback(
                        uploadedFile.path,
                        prepareInstructions({jobDescription,jobTitle})
                    );
                    if(!feedback)return setStatusText('Error:Failed to analyze resume');
                    const feedbackText=typeof feedback.message.content==='string'
                    ? feedback.message.content
                    : feedback.message.content[0].text;

                    data.feedback=JSON.parse(feedbackText);
                    await kv.set(`resume${uuid}`,JSON.stringify(data));
                    setStatusText('Analysis complete redirecting...')
                    console.log(data);

    }
    const handleSubmit=(e: FormEvent<HTMLFormElement>)=>{
        e.preventDefault();
        const form = e.currentTarget;
        if(!form)return;
        const formData=new FormData(form);
        const companyName=formData.get('company-name')as string;
                const jobTitle=formData.get('job-title')as string;

                        const jobDescription=formData.get('job-description')as string;
                        
                        if(!file)return;

                        handleAnalyze({companyName,jobDescription,jobTitle,file});
                  
    }

    const[file,setFile]=useState<File|null>(null)
    

  return (
   <main className="bg-[url('/images/bg-main.svg')] bg-cover">
<Navbar/>

<section className="main-section">
    <div className='page-heading py-16'>
        <h1>Smart Feedback For Your Dream Job</h1>
        {isProcessing?(
            <>
            <h2>{statusText}</h2>
            <img src="/images/resume-scan.gif" className='w-full'/>
            
            </>
        ):(
            <h2>Drop Your Resume for an ATS Score and Imporvement Tips</h2>
        )}
        {!isProcessing &&(
            <form id='upload-form' onSubmit={handleSubmit} className='flex flex-col gap-4 mt-8'>
                <div className='form-div'>
                    <label htmlFor='company-name'>Company Name</label>
                    <input type="text" name='company-name' placeholder='Company Name' id="company-name"></input>
                </div>
                <div className='form-div'>
                    <label htmlFor='job-title'>Job Title</label>
                    <input type="text" name='job-title' placeholder='Job Title' id="job-title"></input>
                </div>
                <div className='form-div'>
                    <label htmlFor='job-description'>Job Description</label>
                    <textarea rows={5} name='job-description' placeholder='Job Description' id="job-description"></textarea>
                </div>
                <div className='form-div'>
                    <label htmlFor='uploader'>Upload Resume</label>
                   <FileUploader onFileSelect={handleFileSelect}/>
                </div>
                <button className='primary button' type='submit'>Analyze Resume</button>
                
            </form>
        )}
    </div>
    </section>
  </main>
  )
}

export default upload